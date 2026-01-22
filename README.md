# Error Replay

[![npm version](https://img.shields.io/npm/v/error-replay.svg)](https://www.npmjs.com/package/error-replay)
[![npm downloads](https://img.shields.io/npm/dm/error-replay.svg)](https://www.npmjs.com/package/error-replay)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A lightweight JavaScript/TypeScript package that records user actions and generates detailed error reports for debugging.

## Features

- Records clicks, inputs, navigation, network requests, and console errors
- Captures React component names for precise debugging
- Auto-sanitizes sensitive data (passwords, credit cards, SSNs)
- Configurable circular buffer with granular tracking options
- Works with all HTTP libraries (axios, fetch, GraphQL clients)

## In Progress

- **Webhook Integration** - Direct error report delivery to your backend endpoints (jira, slack, discord, etc.)

## Installation

```bash
npm install error-replay
```

## Quick Start

```typescript
import ErrorReplay from 'error-replay';

const replay = new ErrorReplay({
    maxActions: 50,
    onError: (report) => {
        // Send report to your error tracking service
        console.log(report);
    }
});

replay.start();
```

## Configuration

```typescript
const replay = new ErrorReplay({
    maxActions: 50,                    // Buffer size
    captureComponents: true,           // React component detection
    trackClicks: true,                 // Click tracking
    trackInputs: true,                 // Input tracking (or use object for granular control)
    trackNavigation: true,             // Route changes
    trackNetwork: true,                // API calls
    trackConsole: true,                // Console errors/warnings
    sanitize: ['.private', 'secret'],  // Additional fields to sanitize
    onError: (report) => {},           // Error callback
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

## Manual Capture

```typescript
try {
    riskyOperation();
} catch (error) {
    const report = replay.capture(error);
    sendToServer(report);
}
```

## License

MIT
