import { BotContext } from 'src/bot/interface/context';
import { learningMenu } from 'src/bot/menus/learning/learning.menu';
import { MESSAGES } from 'src/bot/resources/learning-messages';

export class LearningCommand {
  private map: Map<string, (ctx: BotContext) => void>;
  public commands = {
    learning: 'learning',
  };

  constructor() {
    this.map = new Map<string, (ctx: BotContext) => void>();
  }

  register() {
    this.map.set(this.commands.learning, this.onLearning.bind(this));
    return this.map;
  }

  private async onLearning(ctx: BotContext) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const isMonday = dayOfWeek === 1;

    const message = `${MESSAGES.LEARNING_MENU.HEADER}\n\n${MESSAGES.LEARNING_MENU.SELECT_OPTION}`;

    await ctx.reply(message, {
      parse_mode: 'Markdown',
      ...learningMenu.replyMarkup(isMonday),
    });
  }
}

export const learningCommand = new LearningCommand();
