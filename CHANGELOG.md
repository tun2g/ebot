# Changelog

All notable changes to this project will be documented in this file.

## [1.0.3] - 2026-03-27

### Added

- **Voice Practice (`/voice`)**: Practice English pronunciation by recording voice messages

  - Bot generates a sentence with pronunciation tips
  - Reply with a voice message to get AI-powered pronunciation evaluation
  - Scoring on accuracy (0-4), fluency (0-3), and intonation (0-3)
  - Uses Gemini audio input for transcription and evaluation

- **English Assistant (`/ask`)**: Conversational chat with an AI English tutor

  - Built with Telegraf Scenes (`BaseScene`)
  - Maintains conversation history within the session (up to 20 messages)
  - Supports both Gemini and Fuse (Claude) providers
  - Exit with `/done`

- **AI chat method**: Added `chat()` to AI provider interface for multi-turn conversations
- **Telegraf Scenes support**: Added `session()` and `Stage` middleware to enable scene-based flows
- **Voice evaluation AI methods**: Added `generateVoiceSentence()` and `evaluateVoicePronunciation()` to AI providers

### Changed

- `BotContext` now extends `Scenes.SceneContext` to support Telegraf scenes
- `/help` command reorganized into grouped categories (Learning, Voice, Assistant, General)
- Updated `STRUCTURE.md` and `CLAUDE.md` to reflect new architecture
- Middleware order updated: `session()` and `Stage` added after logger middleware
