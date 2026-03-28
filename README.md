# EBot – AI-Powered English Learning Telegram Bot

An intelligent Telegram bot that helps Vietnamese learners improve their English through **weekly vocabulary topics**, **AI-evaluated sentence practice**, **pronunciation training**, and an **interactive AI assistant** — all within Telegram group chats.

## 🎯 What It Does

EBot turns Telegram groups into collaborative English learning classrooms. Each week, the bot manages a structured learning cycle:

1. **Weekly Topic Selection** — Every Monday, the AI generates 5 topic suggestions based on learning history. Group members vote to pick the week's theme.
2. **Daily Vocabulary** — A new word is posted daily with pronunciation, Vietnamese translation, synonyms, and example sentences.
3. **Sentence Practice** — Members reply with sentences using the daily word. The AI evaluates each response on grammar, usage, and complexity (scored out of 10).
4. **Daily Evaluation** — At 9 PM, the bot posts a leaderboard with detailed feedback and scores for every participant.
5. **Weekly Summary** — End-of-week report with top performers, statistics, and vocabulary recap.

### Additional Features

| Feature                          | Description                                                                                               |
| -------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 🎙️ **Voice Practice** (`/voice`) | AI generates a sentence → user records pronunciation → AI evaluates and gives feedback                    |
| 💬 **AI Assistant** (`/ask`)     | Start a conversation with an English tutor AI. Ask about grammar, vocabulary, or anything English-related |
| 📊 **Learning Stats** (`/stats`) | Track your scores, response count, penalties, and leaderboard position                                    |
| 🏆 **Leaderboards**              | Competitive scoring system to motivate consistent practice                                                |
| ⏱️ **Rate Limiting**             | Prevents abuse of AI-powered features                                                                     |

## 📚 Bot Commands

| Command     | Description                                        |
| ----------- | -------------------------------------------------- |
| `/start`    | Welcome message and main menu                      |
| `/help`     | Full list of features and usage instructions       |
| `/learning` | Open the English learning menu                     |
| `/topic`    | View or select the current week's topic            |
| `/voice`    | Get a pronunciation practice sentence              |
| `/ask`      | Start a conversation with the AI English assistant |
| `/done`     | End the current `/ask` conversation                |
| `/stats`    | View your learning statistics                      |

## 🏗️ How It Works

### Learning Cycle

```
Monday 9 AM          Daily (after topic selected)       9 PM Daily
     │                        │                              │
     ▼                        ▼                              ▼
 AI generates         New vocabulary word              AI evaluates
 5 topic ideas   →    posted with examples    →    all responses &
 Group votes          Members write sentences        posts leaderboard
```

### Group vs Private Chat

- **Groups**: Full learning cycle (topics, vocabulary, evaluations, leaderboards)
- **Private**: Voice practice, AI assistant, personal stats
- Bot only responds in groups when @mentioned or via commands

### AI Providers

EBot supports multiple AI backends:

- **Google Gemini** — Default provider (Gemini 2.0 Flash)
- **Claude via Fuse API** — Alternative provider (Claude Opus 4.5)

Used for: topic generation, vocabulary creation, sentence evaluation, voice pronunciation assessment, and conversational tutoring.

## 📋 Tech Stack

- **Runtime**: Node.js 20 + TypeScript
- **Bot Framework**: Telegraf.js
- **Database**: MongoDB (users, groups, topics, vocabulary, responses, stats)
- **Cache/Sessions**: Redis
- **AI**: Google Gemini / Claude via Fuse API
- **Deployment**: Docker Compose

## 🚀 Getting Started

See [SETUP.md](./SETUP.md) for installation, configuration, and deployment instructions.

## 📄 License

MIT
