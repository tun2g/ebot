import { telegramApiService } from '../../shared/services/telegram-api.service';

interface BotCommand {
  command: string;
  description: string;
}

export class SetUpBotCommand {
  private commands: BotCommand[] = [];

  constructor() {
    this.commands = [
      {
        command: 'start',
        description: 'Start the bot and show welcome message',
      },
      {
        command: 'menu',
        description: 'Open the interactive main menu',
      },
      {
        command: 'help',
        description: 'Show help information and available commands',
      },
      {
        command: 'learning',
        description: 'Open the English learning menu',
      },
      {
        command: 'topic',
        description: 'Show current week topic',
      },
      {
        command: 'stats',
        description: 'Show your learning statistics',
      },
    ];
  }

  /**
   * Sets up bot commands via the Telegram API.
   * All commands should be listed in the constructor following the BotCommand interface.
   */
  async process() {
    await telegramApiService.setMyCommands(this.commands);
  }
}

export const setUpBotCommand = new SetUpBotCommand();
