```
src
├── bot
│   ├── bot-message-handler.ts         // text message handler
│   ├── commands                       // command handler
│   │   ├── menu
│   │   │   └── menu.command.ts
│   │   ├── setup.ts
│   │   └── start
│   │       └── start.command.ts
│   ├── constants
│   │   ├── bot-description.ts
│   │   ├── command.ts
│   │   └── current-action.ts
│   ├── index.ts                        // init bot, set up menu, message handler
│   ├── interface
│   │   ├── context.ts
│   │   └── session.ts
│   ├── menus
│   │   └── game
│   │       ├── game.action-handler.ts  // handle current action
│   │       ├── game.button.ts          // common button used for menus
│   │       ├── game.handler.ts         // click menu handler(click button on menu)
│   │       ├── game.menu.ts            // menu UI
│   │       └── game.resource.ts        // bot's reply message
│   │
│   └── middlewares
│       ├── auth.middleware.ts          // auth middleware
│       └── logger.middleware.ts        // logger middleware
├── configs
│   └── configuration.ts                // app configuration
├── index.ts                            // main function
└── shared
    ├── logger
    │   └── logger.ts                           // logger configuration
    ├── services                                // share services
    │   ├── callback-data-storage.service.ts    // store callback data in dynamic button
    │   ├── redis.service.ts                    // redis service
    │   ├── session.service.ts                  // session service
    │   └── telegram-api.service.ts             // telegram api service
    └── utils
        └── index.ts                            // support functions
```
