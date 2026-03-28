# Changelog

All notable changes to this project will be documented in this file.

## [1.0.5] - 2026-03-29

### Added

- **Monday vocabulary delivery**: First vocabulary word is now sent immediately after topic selection on Monday, instead of waiting until Tuesday
  - Extracted shared `sendVocabularyToGroup()` utility for reuse across cron job and topic selection handlers
  - Both reply-based and inline button topic selection paths trigger immediate vocabulary on Monday
- **IPA pronunciation guide for `/voice`**: Voice practice sentences now include IPA (International Phonetic Alphabet) transcription under the sentence
- **Rate limiting**: Added rate limit service for `/voice` and `/ask` commands to prevent abuse
- **`SETUP.md`**: Separated setup/installation docs from README into a dedicated file
- **`findGroupById()`**: New method on `GroupService` for looking up groups by MongoDB ObjectId

### Changed

- **README.md**: Complete rewrite from generic template to business-focused documentation describing the English learning bot features, commands, and architecture
- **`daily-vocabulary.job.ts`**: Refactored to use shared `sendVocabularyToGroup()` utility, reducing code duplication
- **`topic-selection.handler.ts`**: Confirmation message now says "shortly" instead of "tomorrow at 9 AM" when topic is selected on Monday
- **Gemini voice prompt**: Updated to request and return IPA pronunciation alongside the practice sentence

## [1.0.4] - 2026-03-27

### Added

- **On-demand TTS pronunciation guide**: "🔊 Hear pronunciation" inline button on `/voice` practice sentences
  - Uses Gemini TTS (`gemini-2.5-flash-preview-tts`) to generate natural English speech
  - Audio cached in session — subsequent clicks reuse the cached file
- **Pronunciation button on daily vocabulary**: Each daily vocab message now includes a "🔊 Hear pronunciation" button
  - Audio cached in Redis (24h TTL), shared across all users in the group
- **`generateSpeech()` AI method**: New TTS endpoint added to AI provider interface, implemented in Gemini provider
- **`voice.action-handler.ts`**: Dedicated action handler for voice-related callbacks (follows existing handler pattern)

### Changed

- Replaced static loading text in `/ask` and `/voice` with animated `processRequestWithLoader` progress bar
- Voice evaluation results now have Markdown fallback for responses with special characters
- Raw PCM audio from Gemini TTS is wrapped in a WAV header for proper playback in Telegram

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
