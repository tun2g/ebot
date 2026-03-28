```
src
├── bot
│   ├── bot-message-handler.ts         // text & voice message handler
│   ├── commands                       // command handlers
│   │   ├── dev
│   │   │   └── dev.command.ts
│   │   ├── help
│   │   │   └── help.command.ts
│   │   ├── learning
│   │   │   └── learning.command.ts
│   │   ├── setup.ts                   // register bot commands with Telegram
│   │   ├── shadow
│   │   │   └── shadow.command.ts      // /shadow shadowing practice
│   │   ├── start
│   │   │   └── start.command.ts
│   │   ├── stats
│   │   │   └── stats.command.ts
│   │   ├── topic
│   │   │   └── topic.command.ts
│   │   └── voice
│   │       └── voice.command.ts       // /voice pronunciation practice
│   ├── constants
│   │   ├── bot-description.ts
│   │   ├── command.ts
│   │   └── current-action.ts
│   ├── handlers
│   │   ├── shadow-response.handler.ts // evaluate shadow voice replies
│   │   ├── topic-selection.handler.ts
│   │   ├── vocabulary-response.handler.ts
│   │   ├── voice-response.handler.ts  // evaluate voice message pronunciation
│   │   └── voice.action-handler.ts    // TTS pronunciation button callbacks
│   ├── helper
│   │   └── process-request.helper.ts
│   ├── jobs                           // scheduled cron jobs
│   │   ├── daily-evaluation.job.ts    // 9 PM daily evaluation & leaderboard
│   │   ├── daily-vocabulary.job.ts    // daily vocab broadcast (Tue-Sun)
│   │   ├── index.ts                   // job queue setup
│   │   ├── topic-broadcast.job.ts     // Monday 9 AM topic suggestions
│   │   └── weekly-summary.job.ts      // Sunday weekly summary
│   ├── index.ts                       // init bot, session, stage, middlewares
│   ├── interface
│   │   ├── context.ts                 // BotContext (extends SceneContext)
│   │   └── session.ts
│   ├── menus
│   │   ├── learning
│   │   │   ├── learning.action-handler.ts
│   │   │   ├── learning.handler.ts
│   │   │   └── learning.menu.ts
│   │   └── main
│   │       ├── main.action-handler.ts
│   │       ├── main.handler.ts
│   │       └── main.menu.ts
│   ├── middlewares
│   │   ├── auth.middleware.ts
│   │   ├── logger.middleware.ts
│   │   └── mention-check.middleware.ts
│   ├── resources
│   │   ├── ask-messages.ts            // /ask scene messages
│   │   ├── learning-messages.ts
│   │   ├── rate-limit-messages.ts     // rate limit user-facing messages
│   │   ├── roleplay-messages.ts       // /roleplay scenario messages
│   │   ├── shadow-messages.ts         // /shadow feature messages
│   │   ├── share.resource.ts
│   │   └── voice-messages.ts          // /voice feature messages
│   ├── scenes
│   │   ├── ask
│   │   │   └── ask.scene.ts           // /ask conversational scene
│   │   └── roleplay
│   │       └── roleplay.scene.ts      // /roleplay scenario scene
│   └── utils
│       └── send-vocabulary.util.ts    // shared vocab generation & sending
├── configs
│   └── configuration.ts
├── index.ts                           // main entry point
└── shared
    ├── logger
    │   └── logger.ts
    ├── services
    │   ├── ai
    │   │   ├── ai.interface.ts        // AI provider interface
    │   │   ├── ai.service.ts          // AI service facade
    │   │   ├── fuse.provider.ts       // Claude via Fuse API
    │   │   └── gemini.provider.ts     // Google Gemini provider
    │   ├── callback-data-storage.service.ts
    │   ├── rate-limit.service.ts     // rate limiting for AI features
    │   ├── redis.service.ts
    │   ├── session.service.ts
    │   └── telegram-api.service.ts
    └── utils
        └── index.ts
```
