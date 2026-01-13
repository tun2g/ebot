import { BotContext } from '../../interface/context';

export class HelpCommand {
  private map: Map<string, (ctx: BotContext) => void>;
  private commands: {
    help: string;
  };

  constructor() {
    this.commands = {
      help: 'help',
    };
    this.map = new Map<string, (ctx: BotContext) => void>();
  }

  register() {
    this.map.set(this.commands.help, this.onHelp);
    return this.map;
  }

  /**
   * Help command handler
   * @param ctx BotContext
   */
  async onHelp(ctx: BotContext) {
    const helpMessage = `❓ *Help*

*Available Commands:*
/start \\- Start the bot and show welcome message
/menu \\- Open the main interactive menu
/help \\- Show this help message

*Features:*
• *Commands* \\- Text commands starting with /
• *Menus* \\- Interactive buttons for navigation
• *Pagination* \\- Browse through lists of items
• *Sessions* \\- Your interactions are saved

*Navigation:*
Use inline buttons to navigate through menus\\. Click "Back" buttons to return to previous screens\\.

*Example Workflow:*
1\\. Use /menu to open the main menu
2\\. Select "Simple Menu" to see button examples
3\\. Select "Pagination" to see list navigation
4\\. Use "About" to learn more about the bot

Need more help? Check the documentation\\!`;

    await ctx.replyWithMarkdownV2(helpMessage);
  }
}

export const helpCommand = new HelpCommand();
