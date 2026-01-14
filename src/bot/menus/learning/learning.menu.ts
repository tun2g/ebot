import { Markup } from 'telegraf';

import { MESSAGES } from '../../resources/learning-messages';

export class LearningMenu {
  replyMarkup(isMonday = false) {
    const buttons = [
      [Markup.button.callback(MESSAGES.LEARNING_MENU.BUTTONS.CURRENT_TOPIC, `${LearningMenu.name}CurrentTopic`)],
      [Markup.button.callback(MESSAGES.LEARNING_MENU.BUTTONS.MY_STATS, `${LearningMenu.name}Stats`)],
    ];

    // Only show edit button on Monday
    if (isMonday) {
      buttons.push([
        Markup.button.callback(MESSAGES.LEARNING_MENU.BUTTONS.EDIT_TOPIC, `${LearningMenu.name}EditTopic`),
      ]);
    }

    buttons.push([Markup.button.callback(MESSAGES.LEARNING_MENU.BUTTONS.BACK_TO_MAIN, 'MainMenuBackToMain')]);

    return Markup.inlineKeyboard(buttons);
  }
}

export const learningMenu = new LearningMenu();
