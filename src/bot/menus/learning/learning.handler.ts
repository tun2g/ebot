import { Markup } from 'telegraf';

import { groupService } from '../../../database/services/group.service';
import { userStatsService } from '../../../database/services/user-stats.service';
import { vocabularyService } from '../../../database/services/vocabulary.service';
import { weeklyTopicService } from '../../../database/services/weekly-topic.service';
import { BotContext } from '../../interface/context';
import {
  formatCurrentTopicMessage,
  formatPendingTopicMessage,
  formatUserStatsMessage,
  MESSAGES,
} from '../../resources/learning-messages';
import { LearningMenu, learningMenu } from './learning.menu';

export class LearningMenuHandler {
  private actionsMap: Map<string, (ctx: BotContext) => void>;

  constructor() {
    this.actionsMap = new Map<string, (ctx: BotContext) => void>();
  }

  register() {
    this.actionsMap.set(`${LearningMenu.name}CurrentTopic`, this.showCurrentTopic);
    this.actionsMap.set(`${LearningMenu.name}Stats`, this.showStats);
    this.actionsMap.set(`${LearningMenu.name}EditTopic`, this.editTopic);
    this.actionsMap.set(`${LearningMenu.name}BackToLearning`, this.backToLearning);
    return this.actionsMap;
  }

  /**
   * Show current week's topic
   */
  private async showCurrentTopic(ctx: BotContext) {
    try {
      if (!ctx.chat) {
        await ctx.answerCbQuery(MESSAGES.LEARNING_MENU.GROUP_ONLY);
        return;
      }

      const group = await groupService.findGroupByTelegramId(ctx.chat.id);
      if (!group) {
        await ctx.answerCbQuery(MESSAGES.ERRORS.GROUP_NOT_REGISTERED);
        return;
      }

      const activeTopic = await weeklyTopicService.findActiveTopicForGroup(group._id);

      let message: string;

      if (!activeTopic) {
        message = `${MESSAGES.TOPIC.HEADER}\n\n${MESSAGES.TOPIC.NO_ACTIVE_TOPIC}`;
      } else if (activeTopic.status === 'pending') {
        message = formatPendingTopicMessage(activeTopic.aiSuggestions);
      } else {
        // Get vocabularies covered so far
        const vocabularies = await vocabularyService.getVocabulariesForTopic(activeTopic._id);
        message = formatCurrentTopicMessage({
          topicName: activeTopic.topicName,
          status: activeTopic.status as 'active' | 'pending',
          startDate: activeTopic.startDate,
          endDate: activeTopic.endDate,
          vocabularies: vocabularies.length > 0 ? vocabularies : undefined,
        });
      }

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback(MESSAGES.LEARNING_MENU.BUTTONS.BACK, `${LearningMenu.name}BackToLearning`)],
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...keyboard,
      });

      await ctx.answerCbQuery();
    } catch (error) {
      await ctx.answerCbQuery(MESSAGES.TOPIC.ERROR);
    }
  }

  /**
   * Show user stats
   */
  private async showStats(ctx: BotContext) {
    try {
      if (!ctx.chat || !ctx.from) {
        await ctx.answerCbQuery(MESSAGES.STATS.UNABLE_TO_LOAD);
        return;
      }

      const userId = ctx.from.id;
      const group = await groupService.findGroupByTelegramId(ctx.chat.id);
      if (!group) {
        await ctx.answerCbQuery(MESSAGES.ERRORS.GROUP_NOT_REGISTERED);
        return;
      }

      const activeTopic = await weeklyTopicService.findActiveTopicForGroup(group._id);

      let message: string;

      if (!activeTopic) {
        message = `${MESSAGES.STATS.HEADER}\n\n${MESSAGES.STATS.NO_ACTIVE_TOPIC}`;
      } else {
        const stats = await userStatsService.getStatsForWeek(userId, group._id, activeTopic._id);

        if (!stats) {
          message = `${MESSAGES.STATS.HEADER}\n\n${MESSAGES.STATS.TOPIC_LABEL} **${activeTopic.topicName}**\n\n${MESSAGES.STATS.NOT_PARTICIPATED}`;
        } else {
          const avgScore = stats.responsesSubmitted > 0 ? stats.totalScore / stats.responsesSubmitted : 0;

          // Get leaderboard position
          const leaderboard = await userStatsService.getLeaderboard(activeTopic._id, 100);
          const position = leaderboard.findIndex((s) => s.userId === userId) + 1;

          message = formatUserStatsMessage({
            topicName: activeTopic.topicName,
            responsesSubmitted: stats.responsesSubmitted,
            totalScore: stats.totalScore,
            avgScore,
            penaltyCount: stats.penaltyCount,
            leaderboardPosition: position > 0 ? position : undefined,
            totalParticipants: leaderboard.length,
          });
        }
      }

      const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback(MESSAGES.LEARNING_MENU.BUTTONS.BACK, `${LearningMenu.name}BackToLearning`)],
      ]);

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...keyboard,
      });

      await ctx.answerCbQuery();
    } catch (error) {
      await ctx.answerCbQuery(MESSAGES.STATS.ERROR);
    }
  }

  /**
   * Edit topic (only available on Monday)
   */
  private async editTopic(ctx: BotContext) {
    try {
      const now = new Date();
      const dayOfWeek = now.getDay();

      if (dayOfWeek !== 1) {
        await ctx.answerCbQuery(MESSAGES.LEARNING_MENU.EDIT_ONLY_MONDAY);
        return;
      }

      if (!ctx.chat) {
        await ctx.answerCbQuery(MESSAGES.LEARNING_MENU.GROUP_ONLY);
        return;
      }

      const group = await groupService.findGroupByTelegramId(ctx.chat.id);
      if (!group) {
        await ctx.answerCbQuery(MESSAGES.ERRORS.GROUP_NOT_REGISTERED);
        return;
      }

      const pendingTopic = await weeklyTopicService.findPendingTopicForGroup(group._id);

      let message = `${MESSAGES.LEARNING_MENU.EDIT_HEADER}\n\n`;

      if (!pendingTopic) {
        message += MESSAGES.LEARNING_MENU.NO_PENDING_TOPIC;

        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback(MESSAGES.LEARNING_MENU.BUTTONS.BACK, `${LearningMenu.name}BackToLearning`)],
        ]);

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          ...keyboard,
        });
      } else {
        message += MESSAGES.LEARNING_MENU.SELECT_NEW_TOPIC;

        const buttons = pendingTopic.aiSuggestions.map((topic, index) => [
          Markup.button.callback(`${index + 1}. ${topic}`, `selectTopic_${pendingTopic._id}_${index}`),
        ]);

        buttons.push([
          Markup.button.callback(MESSAGES.LEARNING_MENU.BUTTONS.BACK, `${LearningMenu.name}BackToLearning`),
        ]);

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard(buttons),
        });
      }

      await ctx.answerCbQuery();
    } catch (error) {
      await ctx.answerCbQuery(MESSAGES.LEARNING_MENU.ERROR);
    }
  }

  /**
   * Back to learning menu
   */
  private async backToLearning(ctx: BotContext) {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const isMonday = dayOfWeek === 1;

    const message = `${MESSAGES.LEARNING_MENU.HEADER}\n\n${MESSAGES.LEARNING_MENU.SELECT_OPTION}`;

    await ctx.editMessageText(message, {
      parse_mode: 'Markdown',
      ...learningMenu.replyMarkup(isMonday),
    });

    await ctx.answerCbQuery();
  }
}

export const learningMenuHandler = new LearningMenuHandler();
