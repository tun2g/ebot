import { BotContext } from 'src/bot/interface/context';
import { MainMenu, mainMenu } from 'src/bot/menus/main/main.menu';
import { Markup } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/types';

export class MainMenuHandler {
  private actionsMap: Map<string, (ctx: BotContext) => void>;

  constructor() {
    this.actionsMap = new Map<string, (ctx: BotContext) => void>();
  }

  register() {
    this.actionsMap.set(`${MainMenu.name}SimpleMenu`, this.simpleMenu.bind(this));
    this.actionsMap.set(`${MainMenu.name}Pagination`, this.showPagination.bind(this));
    this.actionsMap.set(`${MainMenu.name}About`, this.about.bind(this));
    this.actionsMap.set(`${MainMenu.name}Help`, this.help.bind(this));
    this.actionsMap.set(`${MainMenu.name}BackToMain`, this.backToMain.bind(this));
    return this.actionsMap;
  }

  /**
   * Simple menu example with action buttons
   */
  private async simpleMenu(ctx: BotContext) {
    const message = `📋 *Simple Menu Example*

This demonstrates a basic menu with inline buttons\\.
Each button triggers a different action\\.

Select an option:`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔔 Show Notification', 'simpleMenuNotification')],
      [Markup.button.callback('📊 Show Data', 'simpleMenuData')],
      [Markup.button.callback('🔄 Refresh', 'simpleMenuRefresh')],
      [Markup.button.callback('⬅️ Back', `${MainMenu.name}BackToMain`)],
    ]);

    await ctx.editMessageText(message, {
      parse_mode: 'MarkdownV2',
      ...keyboard,
    });
  }

  /**
   * Pagination example
   */
  private async showPagination(ctx: BotContext) {
    await this.renderPaginationPage(ctx, 1);
  }

  private async renderPaginationPage(ctx: BotContext, page: number) {
    const itemsPerPage = 3;
    const totalItems = 10;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    // Mock data items
    const allItems = Array.from({ length: totalItems }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      description: `This is item number ${i + 1}`,
    }));

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageItems = allItems.slice(startIndex, endIndex);

    const message = `📄 *Pagination Example*

*Page ${page} of ${totalPages}*

${pageItems.map((item) => `*${item.name}*\n_${item.description}_`).join('\n\n')}`;

    const buttons: InlineKeyboardButton[][] = [];

    // Navigation buttons
    const navButtons: InlineKeyboardButton[] = [];
    if (page > 1) {
      navButtons.push(Markup.button.callback('⬅️ Previous', `pagination_${page - 1}`));
    }
    navButtons.push(Markup.button.callback(`📍 ${page}/${totalPages}`, 'pagination_current'));
    if (page < totalPages) {
      navButtons.push(Markup.button.callback('➡️ Next', `pagination_${page + 1}`));
    }
    buttons.push(navButtons);

    // Back button
    buttons.push([Markup.button.callback('⬅️ Back to Menu', `${MainMenu.name}BackToMain`)]);

    const keyboard = Markup.inlineKeyboard(buttons);

    await ctx.editMessageText(message, {
      parse_mode: 'MarkdownV2',
      ...keyboard,
    });
  }

  /**
   * About information
   */
  private async about(ctx: BotContext) {
    const message = `ℹ️ *About This Bot*

This is a Telegram Bot Template built with:

*Technology Stack:*
• TypeScript
• Telegraf\\.js
• MongoDB \\(Mongoose\\)
• Redis \\(Sessions\\)
• Docker

*Features Demonstrated:*
• Command handling
• Interactive menus
• Pagination
• User management
• Session state

Use this as a starting point for your own bot\\!`;

    const keyboard = Markup.inlineKeyboard([[Markup.button.callback('⬅️ Back', `${MainMenu.name}BackToMain`)]]);

    await ctx.editMessageText(message, {
      parse_mode: 'MarkdownV2',
      ...keyboard,
    });
  }

  /**
   * Help information
   */
  private async help(ctx: BotContext) {
    const message = `❓ *Help*

*Available Commands:*
/start \\- Start the bot and show welcome
/help \\- Show this help message
/learning \\- Open the English learning menu
/topic \\- Show current week topic
/stats \\- Show your learning statistics

*Navigation:*
• Use inline buttons to navigate
• Click "Back" to return to previous menu
• All interactions are saved in your session

*Need More Help?*
Check the documentation or contact support\\.`;

    const keyboard = Markup.inlineKeyboard([[Markup.button.callback('⬅️ Back', `${MainMenu.name}BackToMain`)]]);

    await ctx.editMessageText(message, {
      parse_mode: 'MarkdownV2',
      ...keyboard,
    });
  }

  /**
   * Back to main menu
   */
  private async backToMain(ctx: BotContext) {
    const message = `👋 *Main Menu*

Select an option to explore the bot features:`;

    await ctx.editMessageText(message, {
      parse_mode: 'MarkdownV2',
      ...mainMenu.replyMarkup(),
    });
  }
}

export const mainMenuHandler = new MainMenuHandler();
