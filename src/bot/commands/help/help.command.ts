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

*📚 Learning Commands:*
/learning \\- Open the English learning menu
/topic \\- Show current week topic
/stats \\- Show your learning statistics

*🎙️ Voice Practice:*
/voice \\- Get a sentence and practice pronunciation
_Reply to the sentence with a voice message to get evaluated_

*💬 English Assistant:*
/ask \\- Start a conversation with the English assistant
/done \\- End the current conversation
_Chat freely about grammar, vocabulary, or anything English\\!_

*⚙️ General:*
/start \\- Show welcome message
/help \\- Show this help message

*Navigation:*
Use inline buttons to navigate through menus\\. Click "Back" buttons to return to previous screens\\.

Need more help? Check the documentation\\!`;

    await ctx.replyWithMarkdownV2(helpMessage);
  }
}

export const helpCommand = new HelpCommand();
