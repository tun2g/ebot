import { BotContext } from 'src/bot/interface/context';

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
    this.map.set(this.commands.help, this.onHelp.bind(this));
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
/help \\- Show this help message
/learning \\- Open the English learning menu
/topic \\- Show current week topic
/stats \\- Show your learning statistics
/voice \\- Practice English pronunciation with voice
/ask \\- Chat with the English assistant
/done \\- End the current conversation

*Features:*
• *Commands* \\- Text commands starting with /
• *Menus* \\- Interactive buttons for navigation
• *Sessions* \\- Your interactions are saved

*Navigation:*
Use inline buttons to navigate through menus\\. Click "Back" buttons to return to previous screens\\.

Need more help? Check the documentation\\!`;

    await ctx.replyWithMarkdownV2(helpMessage);
  }
}

export const helpCommand = new HelpCommand();
