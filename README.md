# Error Replay

[![npm version](https://img.shields.io/npm/v/error-replay.svg)](https://www.npmjs.com/package/error-replay)
[![npm downloads](https://img.shields.io/npm/dm/error-replay.svg)](https://www.npmjs.com/package/error-replay)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Bundle Size](https://img.shields.io/badge/gzipped-~14kb-brightgreen)
![TypeScript](https://img.shields.io/badge/types-included-blue)

A lightweight, zero-dependency JavaScript/TypeScript package that records user actions in a circular buffer and generates detailed error reports for debugging. Think of it as a flight recorder for your app — when something crashes, you get the last N actions that led to the error.

**Works everywhere** — browser and server. Same API, no guards needed.

## Features

- 🖱️ Records clicks, inputs, navigation, network requests, and console errors
- ⚛️ Captures React component names for precise debugging
- 🔒 Auto-sanitizes sensitive data (passwords, credit cards, SSNs)
- 🔄 Configurable circular buffer with granular tracking options
- 🌐 Works with all HTTP libraries (axios, fetch, GraphQL clients)
- 📦 Zero runtime dependencies — ships ESM + CJS
- 🌍 **Universal** — runs in browser (CSR) and Node.js (SSR) with auto-detection
- 🔧 Full TypeScript types included (no `@types/` package needed)

### What gets captured in each environment?

| Capability | Browser (CSR) | Server (SSR / Node.js) |
|---|---|---|
| Click tracking | ✅ | — |
| Input tracking | ✅ | — |
| Navigation tracking | ✅ | — |
| Network tracking (fetch/XHR) | ✅ | — |
| Console errors & warnings | ✅ | ✅ |
| Uncaught exceptions | ✅ | ✅ |
| Unhandled promise rejections | ✅ | ✅ |

## In Progress

- **Webhook Integration** — Direct error report delivery to your backend endpoints (Jira, Slack, Discord, etc.)

## Installation

```bash
npm install error-replay
```

```bash
yarn add error-replay
```

```bash
pnpm add error-replay
```

## Quick Start

```typescript
import ErrorReplay from 'error-replay';

const replay = new ErrorReplay({
    maxActions: 50,
    onError: (report) => {
        // Send report to your error tracking service
        fetch('/api/errors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report)
        });
    }
});

replay.start();
```

## What Does the Report Look Like?

<details>
<summary>Click to expand a sample <code>ErrorReport</code></summary>

```json
{
  "reportId": "err_m3k7x2_a9b3f1",
  "timestamp": "2026-03-29T12:00:00.000Z",
  "error": {
    "message": "Cannot read properties of undefined (reading 'balance')",
    "type": "TypeError",
    "stack": "TypeError: Cannot read properties of undefined...\n    at Dashboard.render (Dashboard.tsx:42)"
  },
  "context": {
    "url": "https://app.example.com/dashboard",
    "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)...",
    "viewport": { "width": 1440, "height": 900 },
    "platform": "web",
    "timestamp": "2026-03-29T12:00:00.000Z"
  },
  "user": {
    "id": "usr_12345",
    "sessionId": "sess_abc"
  },
  "actions": [
    {
      "type": "click",
      "element": "button#login-btn",
      "component": "LoginForm",
      "componentPath": "App > AuthPage > LoginForm",
      "text": "Sign In",
      "position": { "x": 720, "y": 400 },
      "timestamp": 1711684740000,
      "page": "/login",
      "relativeTime": "-2m 30s"
    },
    {
      "type": "input",
      "element": "input[name=\"email\"]",
      "component": "LoginForm",
      "inputType": "blur",
      "value": "user@example.com",
      "valueLength": 16,
      "wasCleared": false,
      "isSanitized": false,
      "timestamp": 1711684745000,
      "page": "/login",
      "relativeTime": "-2m 25s"
    },
    {
      "type": "input",
      "element": "input[name=\"password\"]",
      "component": "LoginForm",
      "inputType": "blur",
      "value": "[SANITIZED]",
      "valueLength": 12,
      "wasCleared": false,
      "isSanitized": true,
      "timestamp": 1711684748000,
      "page": "/login",
      "relativeTime": "-2m 22s"
    },
    {
      "type": "network",
      "url": "/api/auth/login",
      "method": "POST",
      "status": 200,
      "duration": 320,
      "timestamp": 1711684750000,
      "page": "/login",
      "relativeTime": "-2m 20s"
    },
    {
      "type": "navigation",
      "from": "/login",
      "to": "/dashboard",
      "timestamp": 1711684751000,
      "page": "/dashboard",
      "relativeTime": "-2m 19s"
    },
    {
      "type": "network",
      "url": "/api/accounts",
      "method": "GET",
      "status": 500,
      "duration": 150,
      "timestamp": 1711684760000,
      "page": "/dashboard",
      "relativeTime": "-2m 10s"
    },
    {
      "type": "console",
      "level": "error",
      "message": "Failed to fetch account data",
      "timestamp": 1711684760000,
      "page": "/dashboard",
      "relativeTime": "-2m 10s"
    }
  ]
}
```

</details>

## Framework Integration

### React (with Error Boundary)

```tsx
import ErrorReplay from 'error-replay';
import { useEffect } from 'react';

// Initialize once at the top level
const replay = new ErrorReplay({
    maxActions: 50,
    captureComponents: true,
    onError: (report) => {
        fetch('/api/errors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report)
        });
    }
});

function App() {
    useEffect(() => {
        replay.start();
        return () => replay.stop();
    }, []);

    return <YourApp />;
}
```

### Next.js (App Router)

Because Next.js renders on the server first, make sure to start ErrorReplay only on the client:

```tsx
// app/providers.tsx
'use client';

import ErrorReplay from 'error-replay';
import { useEffect, useRef } from 'react';

export function ErrorReplayProvider({ children }: { children: React.ReactNode }) {
    const replayRef = useRef<ErrorReplay | null>(null);

    useEffect(() => {
        const replay = new ErrorReplay({
            maxActions: 50,
            onError: (report) => {
                fetch('/api/errors', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(report)
                });
            }
        });

        replay.start();
        replayRef.current = replay;

        return () => replay.cleanup();
    }, []);

    return <>{children}</>;
}
```

```tsx
// app/layout.tsx
import { ErrorReplayProvider } from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html>
            <body>
                <ErrorReplayProvider>{children}</ErrorReplayProvider>
            </body>
        </html>
    );
}
```

### Plain HTML (`<script>` tag)

```html
<script src="https://unpkg.com/error-replay/dist/index.js" type="module"></script>
<script type="module">
    const replay = new ErrorReplay({
        maxActions: 30,
        onError: (report) => {
            console.log('Error captured:', report);
        }
    });
    replay.start();
</script>
```

## Configuration

```typescript
const replay = new ErrorReplay({
    maxActions: 50,                    // Buffer size (default: 50)
    captureComponents: true,           // React component detection (default: true)
    trackClicks: true,                 // Click tracking (default: true)
    trackInputs: true,                 // Input tracking — boolean or object (default: true)
    trackNavigation: true,             // Route changes (default: true)
    trackNetwork: true,                // API calls (default: true)
    trackConsole: true,                // Console errors/warnings (default: true)
    sanitize: ['.private', 'secret'],  // Additional fields to sanitize (default: [])
    onError: (report) => {},           // Error callback
    user: {                            // Custom user data (optional)
        id: 'usr_123',
        sessionId: 'sess_abc'
    }
});
```

### Granular Input Tracking

```typescript
trackInputs: {
    text: true,      // Text inputs and textareas
    checkbox: true,  // Checkboxes and radio buttons
    select: true     // Select dropdowns
}
```

### Privacy & Sanitization

The following fields are **auto-sanitized** (replaced with `[SANITIZED]`):

- Password inputs (`<input type="password">`)
- Phone inputs (`<input type="tel">`)
- Fields with autocomplete: `cc-number`, `cc-csc`, `new-password`, etc.
- Fields with name/id containing: `password`, `secret`, `token`, `api-key`, `credit-card`, `cvv`, `ssn`, `pin`
- Values matching credit card or SSN patterns

Use the `sanitize` option to add custom patterns:

```typescript
sanitize: [
    '.sensitive-field',          // CSS selector
    '#secret-input',             // CSS selector
    '[data-private]',            // Attribute selector
    'bank-account',              // name/id pattern (regex)
]
```

## API Reference

| Method | Returns | Description |
|---|---|---|
| `start()` | `void` | Begin recording user actions. No-ops if already running or in non-browser env. |
| `stop()` | `void` | Stop recording and remove all event listeners. |
| `capture(error)` | `ErrorReport` | Manually capture an error and return a full report. |
| `getActions()` | `UserAction[]` | Get all currently buffered actions. |
| `clear()` | `void` | Clear the action buffer. |
| `cleanup()` | `void` | Stop recording **and** clear the buffer. Use in `useEffect` cleanup. |
| `isActive()` | `boolean` | Check if recording is currently running. |
| `actionCount()` | `number` | Get the number of buffered actions. |

### Manual Capture

Use `capture()` to catch errors in try/catch blocks:

```typescript
try {
    riskyOperation();
} catch (error) {
    const report = replay.capture(error);
    sendToServer(report);
}
```

## Lifecycle Management

For SPAs and development with hot-reload, always clean up when your component unmounts:

```typescript
// React
useEffect(() => {
    replay.start();
    return () => replay.cleanup(); // stops recording + clears buffer
}, []);
```

```typescript
// Vue (Composition API)
import { onMounted, onUnmounted } from 'vue';

onMounted(() => replay.start());
onUnmounted(() => replay.cleanup());
```

## Universal — Browser + Server

ErrorReplay is **truly universal**. The same code works in both browser and Node.js — no guards, no conditional imports, no crashes.

```typescript
// Works everywhere — browser AND server
const replay = new ErrorReplay({
    maxActions: 50,
    onError: (report) => {
        // report.context.platform is 'web' or 'server'
        console.log(`Error on ${report.context.platform}:`, report.error.message);
    }
});
replay.start();
```

**On the server**, `start()` automatically sets up:
- `console.error` / `console.warn` interception
- `process.on('uncaughtException')` handler
- `process.on('unhandledRejection')` handler

**On the browser**, `start()` sets up the full suite of detectors (clicks, inputs, navigation, network, console, global errors).

The `ErrorReport` generated on the server includes `platform: 'server'` and the Node.js version in the `userAgent` field, so you can distinguish where the error occurred.

<details>
<summary>Server-side report example</summary>

```json
{
  "reportId": "err_m3k7x2_a9b3f1",
  "timestamp": "2026-03-29T12:00:00.000Z",
  "error": {
    "message": "Cannot read properties of undefined (reading 'user')",
    "type": "TypeError",
    "stack": "TypeError: Cannot read properties of undefined...\n    at getServerSideProps (/app/pages/dashboard.tsx:15)"
  },
  "context": {
    "url": "server",
    "userAgent": "Node.js/v20.11.0",
    "viewport": { "width": 0, "height": 0 },
    "platform": "server",
    "timestamp": "2026-03-29T12:00:00.000Z"
  },
  "actions": [
    {
      "type": "console",
      "level": "error",
      "message": "Database query failed: connection timeout",
      "timestamp": 1711684799000,
      "page": "server",
      "relativeTime": "-1s"
    }
  ]
}
```

</details>

If you ever need to check the environment yourself, we export an `isBrowser()` helper:

```typescript
import ErrorReplay, { isBrowser } from 'error-replay';

if (isBrowser()) {
    // browser-only logic
}
```

## Browser Support

Targets **ES2020**. Supported in all modern browsers:

| Browser | Minimum Version |
|---|---|
| Chrome | 80+ |
| Firefox | 78+ |
| Safari | 14+ |
| Edge | 80+ |

## License

MIT — see [LICENSE](./LICENSE) for details.
