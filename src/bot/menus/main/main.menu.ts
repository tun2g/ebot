import { Markup } from 'telegraf';

export class MainMenu {
  replyMarkup() {
    return Markup.inlineKeyboard([
      [Markup.button.callback('📋 Simple Menu', `${MainMenu.name}SimpleMenu`)],
      [Markup.button.callback('📄 Pagination Example', `${MainMenu.name}Pagination`)],
      [
        Markup.button.callback('ℹ️ About', `${MainMenu.name}About`),
        Markup.button.callback('❓ Help', `${MainMenu.name}Help`),
      ],
    ]);
  }
}

export const mainMenu = new MainMenu();
