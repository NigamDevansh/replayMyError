# Error Replay

[![npm version](https://img.shields.io/npm/v/error-replay.svg)](https://www.npmjs.com/package/error-replay)
[![npm downloads](https://img.shields.io/npm/dm/error-replay.svg)](https://www.npmjs.com/package/error-replay)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Bundle Size](https://img.shields.io/badge/gzipped-~14kb-brightgreen)
![TypeScript](https://img.shields.io/badge/types-included-blue)

A lightweight JavaScript/TypeScript package that records user actions in a circular buffer and generates detailed error reports. Think of it as a flight recorder for your app - when something crashes, you get the last N actions that led to the error.

Works everywhere - browser and server, with native Slack integration to post error reports grouped as thread replies.

## Features

- Records clicks, inputs, navigation, network requests, and console errors
- Captures React component names for precise debugging
- Auto-sanitizes sensitive data (passwords, credit cards, SSNs)
- Configurable circular buffer with granular tracking options
- Slack Integration: Posts reports to Slack, automatically grouping same-user reports in thread replies to prevent channel clutter.
- Dynamic User Identity: Supports deferred user identity loading (e.g. after login or API fetch).
- Ships ESM + CJS, zero runtime dependencies.
- Universal - runs in browser (CSR) and Node.js (SSR) with auto-detection.
- Full TypeScript types and defineConfig helper included.

### What gets captured in each environment?

| Capability | Browser (CSR) | Server (SSR / Node.js) |
|---|---|---|
| Click tracking | Yes | - |
| Input tracking | Yes | - |
| Navigation tracking | Yes | - |
| Network tracking (fetch/XHR) | Yes | - |
| Console errors & warnings | Yes | Yes |
| Uncaught exceptions | Yes | Yes |
| Unhandled promise rejections | Yes | Yes |

---

## Installation

```bash
npm install error-replay
```

If you intend to use the Slack Integration (server-side only), install `@slack/web-api` as a peer dependency:

```bash
npm install @slack/web-api
```

---

## Setup and Running

Follow these steps to set up and run Error Replay in your project:

### Step 1: Create a configuration file

Create an `error-replay.config.ts` (or `error-replay.config.js`) file in the root of your project. Use the `defineConfig` helper to get full TypeScript autocomplete:

```typescript
// error-replay.config.ts
import { defineConfig } from 'error-replay/config';

export default defineConfig({
    maxActions: 50,
    
    // Identity config: user and user.id are REQUIRED
    user: {
        id: 'anonymous', // Pass a placeholder initially, update at runtime
    },
    
    // Slack configuration (optional, server-side only)
    slack: {
        token: process.env.SLACK_BOT_TOKEN!, // Bot token (xoxb-...)
        channels: ['#error-reports', 'C0123456789'], // Channel names or IDs
        groupByField: 'id', // Thread reports by user ID
        enabled: true
    },

    // Optional error callback (works alongside Slack integration)
    onError: (report) => {
        console.log('Error captured:', report.reportId);
    }
});
```

### Step 2: Initialize the package

Import the package and your configuration file at the entry point of your application (e.g., `index.ts`, `main.tsx`, or `server.js`):

```typescript
import ErrorReplay from 'error-replay';
import config from './error-replay.config';

const replay = new ErrorReplay(config);
replay.start();
```

Calling `replay.start()` automatically detects your environment (browser or server) and installs the necessary global handlers.

### Step 3: Stop or Clean up (Optional)

If your app is a Single Page Application (SPA) or you need to clean up event listeners during development or unmounting:

```typescript
// Stops recording and removes all event listeners
replay.stop();

// Stops recording, removes event listeners, and empties the circular buffer
replay.cleanup();
```

---

## Complete Frontend Setup Example (React)

For frontend applications, since you cannot execute Slack integration directly in the browser (to avoid exposing credentials), you configure the `onError` callback to proxy captured error reports to your backend API.

Here is a complete setup example:

### 1. Define Frontend Configuration (`error-replay.config.ts`)

```typescript
import { defineConfig } from 'error-replay/config';

export default defineConfig({
    maxActions: 50,
    captureComponents: true,
    user: {
        id: 'anonymous', // placeholder, update dynamically later
    },
    onError: (report) => {
        // Send the report payload to your own backend server
        fetch('/api/errors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(report),
        }).catch(err => console.error('Failed to send error report to backend:', err));
    }
});
```

### 2. Initialize in React Component (`App.tsx`)

```tsx
import { useEffect } from 'react';
import ErrorReplay from 'error-replay';
import config from './error-replay.config';

// Initialize the single shared instance
const replay = new ErrorReplay(config);

export default function App() {
    useEffect(() => {
        // Start listening to clicks, inputs, console errors, etc.
        replay.start();

        // Load actual user info from an API and set it dynamically
        fetchUserFromSession().then(user => {
            replay.setUser({
                id: user.id,
                name: user.name,
                email: user.email
            });
        });

        // Clean up event listeners when the app unmounts
        return () => replay.cleanup();
    }, []);

    return (
        <div>
            <h1>My React Application</h1>
            <button onClick={() => { throw new Error('Uncaught frontend error!'); }}>
                Trigger Error
            </button>
        </div>
    );
}
```

### 3. Handle Reports on Backend (`server.js`)

On your server side, you can handle the incoming POST request and forward it to Slack:

```javascript
import express from 'express';
import ErrorReplay from 'error-replay';

const app = express();
app.use(express.json());

// Initialize ErrorReplay on server side with Slack configured
const serverReplay = new ErrorReplay({
    user: { id: 'server' }, // required configuration
    slack: {
        token: process.env.SLACK_BOT_TOKEN,
        channels: ['#error-reports']
    }
});

// Endpoint that receives reports from the frontend
app.post('/api/errors', async (req, res) => {
    try {
        const report = req.body;
        
        // Forward the frontend report directly to Slack
        await serverReplay.sendToSlack(report);
        
        res.status(200).json({ success: true });
    } catch (err) {
        console.error('Slack forwarding failed:', err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(3000);
```

---

## Dynamic User Identity (e.g. loaded from API)

If user details are loaded asynchronously from an API after your application starts, initialize the config with a placeholder (like `{ id: 'anonymous' }`), and then update the user identity dynamically when the data resolves:

```typescript
// Update the user identity dynamically once fetched/loaded
async function onUserLoginOrLoad() {
    const apiUser = await fetchUserFromApi();
    
    replay.setUser({
        id: apiUser.id,
        name: apiUser.name,
        email: apiUser.email,
        metadata: { team: apiUser.team } // Nest arbitrary details in metadata
    });
}
```

---

## Slack Integration Setup

The Slack Integration is **server-side only** (the SDK will throw an error if Slack is initialized in a browser environment to prevent exposing your Bot Token). For frontend apps, use the `onError` callback to proxy reports to your backend, and forward them to Slack from there.

### Required Slack Bot Scopes
Ensure your Slack App has the following OAuth Scopes in the [Slack API Dashboard](https://api.slack.com/apps):

| Scope | Type | Purpose |
|---|---|---|
| `chat:write` | Bot | Posting error reports and thread replies |
| `channels:read` | Bot | Resolving channel names (e.g. `#errors`) to IDs for public channels |
| `groups:read` | Bot | Resolving channel names for private channels |
| `files:write` | Bot | Uploading large JSON reports as file attachments |

*Note: Invite the Slack Bot to all target channels before running.*

---

## Configuration Reference

```typescript
const config = {
    maxActions: 50,                    // Buffer size (default: 50)
    captureComponents: true,           // React component detection (default: true)
    trackClicks: true,                 // Click tracking (default: true)
    trackInputs: true,                 // Input tracking — boolean or object (default: true)
    trackNavigation: true,             // Route changes (default: true)
    trackNetwork: true,                // API calls (default: true)
    trackConsole: true,                // Console errors/warnings (default: true)
    sanitize: ['.private', 'secret'],  // Additional fields to sanitize (default: [])
    onError: (report) => {},           // Error callback (optional)
    
    // User Identity (REQUIRED)
    user: {
        id: string;                    // Unique identifier (REQUIRED)
        name?: string;                 // Display name (optional)
        email?: string;                // Email (optional)
        sessionId?: string;            // Session identifier (optional)
        metadata?: Record<string, unknown>; // Custom structured data (optional)
    },

    // Slack Integration (optional, server-side only)
    slack: {
        token: string;                 // Bot token (xoxb-...)
        channels?: string[];           // Channel names/IDs (default: ['#error-replay'])
        groupByField?: string;         // Field to group threads by. Supports 'id', 'name', 
                                       // 'email', 'sessionId', or 'metadata.<key>' (default: 'id')
        enabled?: boolean;             // Toggle Slack on/off (default: true)
    }
};
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

---

## API Reference

| Method | Returns | Description |
|---|---|---|
| `start()` | `void` | Begin recording user actions. |
| `stop()` | `void` | Stop recording and remove all event listeners. |
| `setUser(user)` | `void` | Dynamically update the user identity (requires `user.id`). |
| `capture(error)` | `ErrorReport` | Manually capture an error and return a full report. |
| `sendToSlack(report)`| `Promise<void>` | Manually send a report to Slack. Resolves on delivery confirmation. |
| `getActions()` | `UserAction[]` | Get all currently buffered actions. |
| `clear()` | `void` | Clear the action buffer. |
| `cleanup()` | `void` | Stop recording and clear the buffer. |
| `isActive()` | `boolean` | Check if recording is currently running. |
| `actionCount()` | `number` | Get the number of buffered actions. |

---

## License

MIT — see [LICENSE](./LICENSE) for details.
