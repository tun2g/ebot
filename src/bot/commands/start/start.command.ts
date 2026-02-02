import { BotContext } from 'src/bot/interface/context';
import { mainMenu } from 'src/bot/menus/main/main.menu';
import { userService } from 'src/database/services/user.service';

export class StartCommand {
  private map: Map<string, (ctx: BotContext) => void>;
  private commands: {
    start: string;
  };

  constructor() {
    this.commands = {
      start: 'start',
    };
    this.map = new Map<string, (ctx: BotContext) => void>();
  }

  register() {
    this.map.set(this.commands.start, this.onStart.bind(this));
    return this.map;
  }

  /**
   * Using for /start command and bot's start event
   * @param ctx BotContext
   */
  async onStart(ctx: BotContext) {
    const user = await userService.findOrCreateUser(ctx);
    const displayName = user?.firstName || user?.username || 'User';

    const welcomeMessage = `👋 *Welcome ${displayName}\\!*

This is a Telegram Bot Template demonstrating core features:

🎯 *Core Features:*
• Command handling
• Interactive menus with buttons
• User session management
• MongoDB integration

📚 *Available Commands:*
/start \\- Show this welcome message
/help \\- Get help information
/learning \\- Open the English learning menu
/topic \\- Show current week topic
/stats \\- Show your learning statistics

Use the buttons below to explore the bot features\\!`;

    await ctx.replyWithMarkdownV2(welcomeMessage, mainMenu.replyMarkup());
  }
}

export const startCommand = new StartCommand();
