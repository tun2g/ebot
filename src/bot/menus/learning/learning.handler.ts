import { BotContext } from 'src/bot/interface/context';
import { LearningMenu, learningMenu } from 'src/bot/menus/learning/learning.menu';
import {
  formatCurrentTopicMessage,
  formatPendingTopicMessage,
  formatUserStatsMessage,
  MESSAGES,
} from 'src/bot/resources/learning-messages';
import { groupService } from 'src/database/services/group.service';
import { userStatsService } from 'src/database/services/user-stats.service';
import { vocabularyService } from 'src/database/services/vocabulary.service';
import { weeklyTopicService } from 'src/database/services/weekly-topic.service';
import logger from 'src/shared/logger/logger';
import { Markup } from 'telegraf';

export class LearningMenuHandler {
  private actionsMap: Map<string, (ctx: BotContext) => void>;

  constructor() {
    this.actionsMap = new Map<string, (ctx: BotContext) => void>();
  }

  register() {
    this.actionsMap.set(`${LearningMenu.name}CurrentTopic`, this.showCurrentTopic.bind(this));
    this.actionsMap.set(`${LearningMenu.name}Stats`, this.showStats.bind(this));
    this.actionsMap.set(`${LearningMenu.name}EditTopic`, this.editTopic.bind(this));
    this.actionsMap.set(`${LearningMenu.name}BackToLearning`, this.backToLearning.bind(this));
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

      logger.info(
        `[LearningMenu] showCurrentTopic called - ChatID: ${ctx.chat.id}, ChatTitle: ${
          'title' in ctx.chat ? ctx.chat.title : 'N/A'
        }, UserID: ${ctx.from?.id || 'N/A'}`
      );

      const group = await groupService.findGroupByTelegramId(ctx.chat.id);
      if (!group) {
        logger.warn(
          `[LearningMenu] showCurrentTopic - GROUP NOT REGISTERED - ChatID: ${ctx.chat.id}. User will see error message. Suggestion: Group should be auto-registered on /start or first interaction.`
        );
        await ctx.answerCbQuery(MESSAGES.ERRORS.GROUP_NOT_REGISTERED);
        return;
      }

      logger.info(
        `[LearningMenu] showCurrentTopic - Group found - GroupID: ${group._id}, TelegramID: ${
          group.telegramGroupId
        }, ActiveTopicID: ${group.activeWeeklyTopicId || 'null'}`
      );

      const activeTopic = await weeklyTopicService.findActiveTopicForGroup(group._id);

      let message: string;

      if (!activeTopic) {
        logger.info(`[LearningMenu] showCurrentTopic - No active topic found for group ${group._id}`);
        message = `${MESSAGES.TOPIC.HEADER}\n\n${MESSAGES.TOPIC.NO_ACTIVE_TOPIC}`;
      } else if (activeTopic.status === 'pending') {
        logger.info(
          `[LearningMenu] showCurrentTopic - Pending topic found - TopicID: ${activeTopic._id}, Status: ${activeTopic.status}`
        );
        message = formatPendingTopicMessage(activeTopic.aiSuggestions);
      } else {
        logger.info(
          `[LearningMenu] showCurrentTopic - Active topic found - TopicID: ${activeTopic._id}, TopicName: "${activeTopic.topicName}", Status: ${activeTopic.status}`
        );
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
      logger.error(
        `[LearningMenu] ERROR in showCurrentTopic - ChatID: ${ctx.chat?.id || 'N/A'}, Error: ${
          error instanceof Error ? error.message : String(error)
        }, Stack: ${error instanceof Error ? error.stack : 'N/A'}`
      );
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

      logger.info(
        `[LearningMenu] showStats called - ChatID: ${ctx.chat.id}, UserID: ${ctx.from.id}, Username: ${
          ctx.from.username || 'N/A'
        }`
      );

      const userId = ctx.from.id;
      const group = await groupService.findGroupByTelegramId(ctx.chat.id);
      if (!group) {
        logger.warn(
          `[LearningMenu] showStats - GROUP NOT REGISTERED - ChatID: ${ctx.chat.id}, UserID: ${userId}. User will see error message.`
        );
        await ctx.answerCbQuery(MESSAGES.ERRORS.GROUP_NOT_REGISTERED);
        return;
      }

      logger.info(
        `[LearningMenu] showStats - Group found - GroupID: ${group._id}, TelegramID: ${group.telegramGroupId}`
      );

      const activeTopic = await weeklyTopicService.findActiveTopicForGroup(group._id);

      let message: string;

      if (!activeTopic) {
        logger.info(`[LearningMenu] showStats - No active topic for group ${group._id}`);
        message = `${MESSAGES.STATS.HEADER}\n\n${MESSAGES.STATS.NO_ACTIVE_TOPIC}`;
      } else {
        logger.info(
          `[LearningMenu] showStats - Active topic found - TopicID: ${activeTopic._id}, TopicName: "${activeTopic.topicName}"`
        );
        const stats = await userStatsService.getStatsForWeek(userId, group._id, activeTopic._id);

        if (!stats) {
          logger.info(`[LearningMenu] showStats - No stats found for user ${userId} in topic ${activeTopic._id}`);
          message = `${MESSAGES.STATS.HEADER}\n\n${MESSAGES.STATS.TOPIC_LABEL} **${activeTopic.topicName}**\n\n${MESSAGES.STATS.NOT_PARTICIPATED}`;
        } else {
          const avgScore = stats.responsesSubmitted > 0 ? stats.totalScore / stats.responsesSubmitted : 0;

          // Get leaderboard position
          const leaderboard = await userStatsService.getLeaderboard(activeTopic._id, 100);
          const position = leaderboard.findIndex((s) => s.userId === userId) + 1;

          logger.info(
            `[LearningMenu] showStats - Stats loaded - UserID: ${userId}, ResponsesSubmitted: ${stats.responsesSubmitted}, TotalScore: ${stats.totalScore}, LeaderboardPosition: ${position}/${leaderboard.length}`
          );

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
      logger.error(
        `[LearningMenu] ERROR in showStats - ChatID: ${ctx.chat?.id || 'N/A'}, UserID: ${
          ctx.from?.id || 'N/A'
        }, Error: ${error instanceof Error ? error.message : String(error)}, Stack: ${
          error instanceof Error ? error.stack : 'N/A'
        }`
      );
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

      logger.info(
        `[LearningMenu] editTopic called - ChatID: ${ctx.chat.id}, UserID: ${ctx.from?.id || 'N/A'}, DayOfWeek: Monday`
      );

      const group = await groupService.findGroupByTelegramId(ctx.chat.id);
      if (!group) {
        logger.warn(
          `[LearningMenu] editTopic - GROUP NOT REGISTERED - ChatID: ${ctx.chat.id}. User will see error message.`
        );
        await ctx.answerCbQuery(MESSAGES.ERRORS.GROUP_NOT_REGISTERED);
        return;
      }

      logger.info(
        `[LearningMenu] editTopic - Group found - GroupID: ${group._id}, TelegramID: ${group.telegramGroupId}`
      );

      const pendingTopic = await weeklyTopicService.findPendingTopicForGroup(group._id);

      let message = `${MESSAGES.LEARNING_MENU.EDIT_HEADER}\n\n`;

      if (!pendingTopic) {
        logger.info(`[LearningMenu] editTopic - No pending topic found for group ${group._id}`);
        message += MESSAGES.LEARNING_MENU.NO_PENDING_TOPIC;

        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback(MESSAGES.LEARNING_MENU.BUTTONS.BACK, `${LearningMenu.name}BackToLearning`)],
        ]);

        await ctx.editMessageText(message, {
          parse_mode: 'Markdown',
          ...keyboard,
        });
      } else {
        logger.info(
          `[LearningMenu] editTopic - Pending topic found - TopicID: ${pendingTopic._id}, Suggestions count: ${pendingTopic.aiSuggestions.length}`
        );
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
      logger.error(
        `[LearningMenu] ERROR in editTopic - ChatID: ${ctx.chat?.id || 'N/A'}, Error: ${
          error instanceof Error ? error.message : String(error)
        }, Stack: ${error instanceof Error ? error.stack : 'N/A'}`
      );
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
