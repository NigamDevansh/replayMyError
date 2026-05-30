# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2026-05-30

This is a major breaking release (v2.0.0) that adds Slack integration and transition to a configuration file system.

### Added
- **Slack Integration**: Automatically posts error reports to Slack.
  - Server-side only (throws error if instantiated in browser).
  - Thread grouping: Automatically groups reports by user identity into separate Slack threads to avoid channel clutter.
  - Channel name resolution: Resolves `#channel-name` automatically to Slack Channel IDs.
  - Automatic queueing: Queues reports during network outages, resolving/rejecting individual report promises.
  - Large report handling: Uploads report JSONs exceeding 3KB as file attachments (uses `filesUploadV2`), falling back to code block truncation if file upload fails.
  - Retries: Retries failed delivery up to 3 times with exponential backoff and respects the Slack `Retry-After` header.
- **Dynamic User Identity**: `replay.setUser(user)` method allows setting/updating user identity dynamically at runtime (useful after loading user details asynchronously from an API).
- **defineConfig helper**: Imported from `error-replay/config` to provide typed autocomplete in configuration files.

### Changed
- **Breaking**: Configuration must now be passed as a config object during initialization. The constructor no longer accepts individual parameters.
- **Breaking**: `user` field in configuration is now required.
- **Breaking**: `user.id` is now a required property (acts as the default thread grouping key on Slack).
- **Build entrypoints**: Added a second lightweight entrypoint `error-replay/config` so configurations can be defined without loading the entire runtime library.
