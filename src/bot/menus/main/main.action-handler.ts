import { BotContext } from 'src/bot/interface/context';
import { MainMenu } from 'src/bot/menus/main/main.menu';
import { Markup } from 'telegraf';
import { InlineKeyboardButton } from 'telegraf/types';

export class MainMenuActionHandler {
  private actionsMap: Map<string | RegExp, (ctx: BotContext) => void>;

  constructor() {
    this.actionsMap = new Map<string | RegExp, (ctx: BotContext) => void>();
  }

  register() {
    // Simple menu actions
    this.actionsMap.set('simpleMenuNotification', this.showNotification.bind(this));
    this.actionsMap.set('simpleMenuData', this.showData.bind(this));
    this.actionsMap.set('simpleMenuRefresh', this.refreshSimpleMenu.bind(this));
    this.actionsMap.set('simpleMenuBack', this.simpleMenuBack.bind(this));
    this.actionsMap.set('simpleMenuAlert', this.simpleMenuAlert.bind(this));

    // Pagination actions (regex pattern)
    this.actionsMap.set(/^pagination_(\d+)$/, this.handlePagination.bind(this));
    this.actionsMap.set('pagination_current', this.paginationCurrent.bind(this));

    return this.actionsMap;
  }

  /**
   * Show notification example
   */
  private async showNotification(ctx: BotContext) {
    await ctx.answerCbQuery('✅ This is a callback query notification!', {
      show_alert: false,
    });

    const message = `🔔 *Notification Example*

This demonstrates callback query notifications\\.

*Types of notifications:*
• *Toast* \\- Small popup \\(current\\)
• *Alert* \\- Full screen alert

Try clicking the button again\\!`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔔 Show Again', 'simpleMenuNotification')],
      [Markup.button.callback('⚠️ Show Alert', 'simpleMenuAlert')],
      [Markup.button.callback('⬅️ Back', 'simpleMenuBack')],
    ]);

    await ctx.editMessageText(message, {
      parse_mode: 'MarkdownV2',
      ...keyboard,
    });
  }

  /**
   * Show data example
   */
  private async showData(ctx: BotContext) {
    await ctx.answerCbQuery();

    const mockData = {
      userId: ctx.from?.id || 0,
      username: ctx.from?.username || 'unknown',
      timestamp: new Date().toISOString(),
      messageCount: Math.floor(Math.random() * 100),
    };

    const message = `📊 *Data Example*

Here's some dynamic data:

*User Info:*
• ID: \`${mockData.userId}\`
• Username: @${mockData.username}
• Time: \`${mockData.timestamp.split('T')[0]}\`
• Messages: ${mockData.messageCount}

This data could come from your database\\!`;

    const keyboard = Markup.inlineKeyboard([
      [Markup.button.callback('🔄 Reload Data', 'simpleMenuData')],
      [Markup.button.callback('⬅️ Back', 'simpleMenuBack')],
    ]);

    await ctx.editMessageText(message, {
      parse_mode: 'MarkdownV2',
      ...keyboard,
    });
  }

  /**
   * Refresh simple menu
   */
  private async refreshSimpleMenu(ctx: BotContext) {
    await ctx.answerCbQuery('🔄 Menu refreshed!');

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
   * Handle pagination navigation
   */
  private async handlePagination(ctx: BotContext) {
    await ctx.answerCbQuery();

    // Extract page number from callback data
    const callbackData = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : '';
    const match = callbackData?.match(/^pagination_(\d+)$/);
    const page = match ? parseInt(match[1], 10) : 1;

    await this.renderPaginationPage(ctx, page);
  }

  /**
   * Handle current page button click
   */
  private async paginationCurrent(ctx: BotContext) {
    await ctx.answerCbQuery('📍 You are on this page');
  }

  /**
   * Render pagination page (reusable)
   */
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
   * Navigate back to the simple menu
   */
  private async simpleMenuBack(ctx: BotContext) {
    await ctx.answerCbQuery();

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
   * Show an alert notification to the user
   */
  private async simpleMenuAlert(ctx: BotContext) {
    await ctx.answerCbQuery('⚠️ This is an ALERT notification! It shows as a popup.', {
      show_alert: true,
    });
  }
}

export const mainMenuActionHandler = new MainMenuActionHandler();
