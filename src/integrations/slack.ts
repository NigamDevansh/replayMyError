import type { WebClient } from '@slack/web-api';
import type { SlackConfig, UserConfig } from '../types/config';
import type { ErrorReport } from '../types/report';
import { isBrowser } from '../utils/env';

interface ThreadEntry {
    threadTs: string;
    replyCount: number;
    createdAt: number;
}

interface QueueEntry {
    report: ErrorReport;
    retries: number;
    resolve: () => void;
    reject: (err: Error) => void;
}

export class SlackIntegration {
    private clientPromise: Promise<WebClient> | null = null;
    private config: { token: string; channels: string[]; groupByField: string; enabled: boolean };
    private threadMap: Map<string, Map<string, ThreadEntry>> = new Map();
    private channelIdCache: Map<string, string> = new Map();
    private queue: QueueEntry[] = [];
    private processing: boolean = false;

    private static readonly THREAD_TTL_MS = 24 * 60 * 60 * 1000;
    private static readonly MAX_THREAD_ENTRIES = 500;
    private static readonly MAX_REPLIES_PER_THREAD = 950;
    private static readonly MAX_RETRIES = 3;
    private static readonly JSON_TRUNCATE_LIMIT = 30000;
    private static readonly MAX_QUEUE_SIZE = 100;

    constructor(config: SlackConfig) {
        if (isBrowser()) {
            throw new Error(
                '[ErrorReplay] Slack integration is server-side only. ' +
                'In browser environments, use the onError callback to POST ' +
                'to your own backend, which can then forward to Slack.'
            );
        }
        this.config = {
            token: config.token,
            channels: config.channels ?? ['#error-replay'],
            groupByField: config.groupByField ?? 'id',
            enabled: config.enabled ?? true,
        };
    }

    // ── Public API ──────────────────────────────────────

    /** 
     * Send a report to all configured Slack channels.
     * Returns a promise that resolves when delivery is confirmed,
     * or rejects after MAX_RETRIES failures.
     */
    async sendReport(report: ErrorReport): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            // Enforce queue size limit
            if (this.queue.length >= SlackIntegration.MAX_QUEUE_SIZE) {
                const dropped = this.queue.shift()!;
                dropped.reject(new Error('[ErrorReplay] Slack queue full — oldest report dropped.'));
                console.warn('[ErrorReplay] Slack queue full. Dropping oldest report.');
            }

            this.queue.push({ report, retries: 0, resolve, reject });

            if (!this.processing) {
                this.processQueue(); // fire-and-forget, but item.resolve/reject controls the caller's promise
            }
        });
    }

    // ── Queue Processing ────────────────────────────────

    private async processQueue(): Promise<void> {
        this.processing = true;
        this.evictStaleThreads(); // once per batch, NOT per item

        while (this.queue.length > 0) {
            const item = this.queue.shift()!;
            try {
                const client = await this.getClient();
                for (const channel of this.config.channels) {
                    const channelId = await this.resolveChannelId(client, channel);
                    await this.postToChannel(client, channelId, item.report);
                }
                item.resolve(); // ✅ delivery confirmed
            } catch (err: any) {
                const retryAfter = err?.data?.retry_after;
                if (item.retries < SlackIntegration.MAX_RETRIES) {
                    const delay = (retryAfter || Math.pow(2, item.retries)) * 1000;
                    await new Promise(r => setTimeout(r, delay));
                    item.retries++;
                    this.queue.unshift(item); // re-enqueue, same promise
                } else {
                    const finalErr = new Error(
                        `[ErrorReplay] Failed to send to Slack after ${SlackIntegration.MAX_RETRIES} retries: ${err}`
                    );
                    item.reject(finalErr); // ❌ delivery failed
                    console.error(finalErr.message);
                }
            }
        }
        this.processing = false;
    }

    // ── Lazy Client Init (dynamic import for ESM compat) ─

    private async getClient(): Promise<WebClient> {
        if (!this.clientPromise) {
            this.clientPromise = import('@slack/web-api').then(
                ({ WebClient }) => new WebClient(this.config.token)
            ).catch(() => {
                throw new Error(
                    '[ErrorReplay] @slack/web-api is required for Slack integration. ' +
                    'Install it: npm install @slack/web-api'
                );
            });
        }
        return this.clientPromise;
    }

    // ── Channel Resolution ──────────────────────────────

    private async resolveChannelId(client: WebClient, channel: string): Promise<string> {
        // If it starts with C, G, or D followed by uppercase alphanumeric characters, it is likely already an ID
        if (/^[CGD][A-Z0-9]+$/.test(channel)) return channel;

        const cached = this.channelIdCache.get(channel);
        if (cached) return cached;

        const name = channel.replace(/^#/, '');
        let cursor: string | undefined;
        do {
            const result: any = await client.conversations.list({
                types: 'public_channel,private_channel',
                limit: 200,
                cursor,
            });
            const match = result.channels?.find((c: any) => c.name === name);
            if (match?.id) {
                this.channelIdCache.set(channel, match.id);
                return match.id;
            }
            cursor = result.response_metadata?.next_cursor;
        } while (cursor);

        throw new Error(
            `[ErrorReplay] Slack channel "${channel}" not found. ` +
            `Use a channel ID (C0123456789) or ensure the bot is invited to the channel.`
        );
    }

    // ── Thread Grouping ─────────────────────────────────

    /** 
     * Extract the grouping key from the user object.
     * Supports top-level fields and dotted metadata paths.
     */
    private getGroupKey(user: UserConfig): string {
        const field = this.config.groupByField;

        // Handle metadata sub-fields: 'metadata.team' → user.metadata?.team
        if (field.startsWith('metadata.')) {
            const metaKey = field.slice('metadata.'.length);
            const value = user.metadata?.[metaKey];
            if (value != null) return String(value);
            return user.id; // fallback
        }

        // Handle top-level fields: 'id', 'name', 'email', 'sessionId'
        const value = (user as unknown as Record<string, unknown>)[field];
        if (value != null) return String(value);

        return user.id; // final fallback
    }

    // ── Posting Logic ───────────────────────────────────

    private async postToChannel(client: WebClient, channelId: string, report: ErrorReport): Promise<void> {
        const groupKey = this.getGroupKey(report.user);

        if (!this.threadMap.has(channelId)) {
            this.threadMap.set(channelId, new Map());
        }
        const channelThreads = this.threadMap.get(channelId)!;
        let entry = channelThreads.get(groupKey);

        // Thread rotation after MAX_REPLIES
        if (entry && entry.replyCount >= SlackIntegration.MAX_REPLIES_PER_THREAD) {
            channelThreads.delete(groupKey);
            entry = undefined;
        }

        if (!entry) {
            // Create parent thread message
            const result = await client.chat.postMessage({
                channel: channelId,
                text: `🔴 Error Reports — User: ${groupKey}`,
                blocks: [
                    { type: 'header', text: { type: 'plain_text', text: `🔴 Error Reports — User: ${groupKey}` } },
                    { type: 'section', text: { type: 'mrkdwn', text: 'All error reports for this user will appear as replies in this thread.' } },
                ],
            });
            entry = { threadTs: result.ts!, replyCount: 0, createdAt: Date.now() };
            channelThreads.set(groupKey, entry);
        }

        // Post summary as thread reply
        await client.chat.postMessage({
            channel: channelId,
            thread_ts: entry.threadTs,
            text: `⚠️ ${report.error.type}: ${report.error.message}`,
            blocks: this.buildSummaryBlocks(report),
        });
        entry.replyCount++;

        // Post full JSON (with file upload fallback)
        await this.postJsonReport(client, channelId, entry.threadTs, report);
        entry.replyCount++;
    }

    // ── JSON Report Posting ─────────────────────────────

    private async postJsonReport(
        client: WebClient, channelId: string, threadTs: string, report: ErrorReport
    ): Promise<void> {
        const json = JSON.stringify(report, null, 2);

        if (json.length <= SlackIntegration.JSON_TRUNCATE_LIMIT) {
            await client.chat.postMessage({
                channel: channelId,
                thread_ts: threadTs,
                text: `📄 Full Report JSON\n\`\`\`json\n${json}\n\`\`\``,
            });
        } else {
            // Upload as file
            try {
                await client.filesUploadV2({
                    channel_id: channelId,
                    thread_ts: threadTs,
                    content: json,
                    filename: `error-report-${report.reportId}.json`,
                    title: `📄 Error Report ${report.reportId}`,
                });
            } catch {
                // Fallback: truncated code block
                const truncated = json.slice(0, 2900) +
                    `\n... [TRUNCATED — full report: ${json.length} chars]`;
                await client.chat.postMessage({
                    channel: channelId,
                    thread_ts: threadTs,
                    text: `📄 Report JSON (truncated)\n\`\`\`json\n${truncated}\n\`\`\``,
                });
            }
        }
    }

    // ── Message Formatting ──────────────────────────────

    private buildSummaryBlocks(report: ErrorReport): any[] {
        const actions = report.actions.slice(-3).map(a => {
            if (a.type === 'click') return `• [click] ${a.element} — "${a.text}" (${a.relativeTime})`;
            if (a.type === 'network') return `• [network] ${a.method} ${a.url} → ${a.status} (${a.relativeTime})`;
            if (a.type === 'navigation') return `• [navigation] ${a.from} → ${a.to} (${a.relativeTime})`;
            if (a.type === 'input') return `• [input] ${a.element} (${a.relativeTime})`;
            if (a.type === 'console') return `• [console.${a.level}] ${a.message} (${a.relativeTime})`;
            return `• [${(a as any).type}] (${(a as any).relativeTime})`;
        });

        const userLine = [report.user.id, report.user.email].filter(Boolean).join(' • ');

        return [
            { type: 'header', text: { type: 'plain_text', text: `⚠️ ${report.error.type}: ${report.error.message.slice(0, 100)}` } },
            { type: 'divider' },
            { type: 'section', text: { type: 'mrkdwn', text:
                `📋 *Report:* ${report.reportId}\n` +
                `🕐 *Time:* ${report.timestamp}\n` +
                `🌐 *URL:* ${report.context.url}\n` +
                `🖥️ *Platform:* ${report.context.platform}`
            }},
            { type: 'section', text: { type: 'mrkdwn', text: `👤 *User:* ${userLine}` }},
            ...(actions.length > 0 ? [
                { type: 'section', text: { type: 'mrkdwn', text: `📝 *Last ${actions.length} Actions:*\n${actions.join('\n')}` }}
            ] : []),
        ];
    }

    // ── Thread Eviction (TTL + max size) ────────────────

    private evictStaleThreads(): void {
        const now = Date.now();
        for (const [channel, threads] of this.threadMap) {
            // Remove expired entries
            for (const [key, entry] of threads) {
                if (now - entry.createdAt > SlackIntegration.THREAD_TTL_MS) {
                    threads.delete(key);
                }
            }
            // Cap total entries per channel
            if (threads.size > SlackIntegration.MAX_THREAD_ENTRIES) {
                const sorted = [...threads.entries()].sort((a, b) => a[1].createdAt - b[1].createdAt);
                const toRemove = sorted.slice(0, threads.size - SlackIntegration.MAX_THREAD_ENTRIES);
                for (const [key] of toRemove) threads.delete(key);
            }
        }
    }
}
