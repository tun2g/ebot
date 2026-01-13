import { userService } from '../../../database/services/user.service';
import { BotContext } from '../../interface/context';
import { mainMenu } from '../../menus/main/main.menu';

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
    this.map.set(this.commands.start, this.onStart);
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
• Pagination examples
• User session management
• MongoDB integration

📚 *Available Commands:*
/start \\- Show this welcome message
/menu \\- Open interactive menu
/help \\- Get help information

Use the buttons below to explore the bot features\\!`;

    await ctx.replyWithMarkdownV2(welcomeMessage, mainMenu.replyMarkup());
  }
}

export const startCommand = new StartCommand();
