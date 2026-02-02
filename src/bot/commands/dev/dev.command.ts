import { processRequestWithLoader } from 'src/bot/helper/process-request.helper';
import { BotContext } from 'src/bot/interface/context';
import {
  formatDailyEvaluationMessage,
  formatReminderMessage,
  formatTopicBroadcastMessage,
  formatVocabularyMessage,
  formatWeeklySummaryMessage,
} from 'src/bot/resources/learning-messages';
import { configService } from 'src/configs/configuration';
import { IVocabulary } from 'src/database/models/vocabulary.model';
import { WeeklyTopicStatus } from 'src/database/models/weekly-topic.model';
import { groupService } from 'src/database/services/group.service';
import { userService } from 'src/database/services/user.service';
import { userResponseService } from 'src/database/services/user-response.service';
import { userStatsService } from 'src/database/services/user-stats.service';
import { vocabularyService } from 'src/database/services/vocabulary.service';
import { weeklyTopicService } from 'src/database/services/weekly-topic.service';
import logger from 'src/shared/logger/logger';
import { aiService } from 'src/shared/services/ai/ai.service';

const DEV_DISABLED_MESSAGE = 'Dev commands are disabled';

export class DevCommand {
  private map: Map<string, (ctx: BotContext) => void>;
  public commands = {
    dev_topic: 'dev_topic',
    dev_vocab: 'dev_vocab',
    dev_eval: 'dev_eval',
    dev_summary: 'dev_summary',
  };

  constructor() {
    this.map = new Map<string, (ctx: BotContext) => void>();
  }

  register() {
    this.map.set(this.commands.dev_topic, this.onDevTopic.bind(this));
    this.map.set(this.commands.dev_vocab, this.onDevVocab.bind(this));
    this.map.set(this.commands.dev_eval, this.onDevEval.bind(this));
    this.map.set(this.commands.dev_summary, this.onDevSummary.bind(this));
    return this.map;
  }

  /**
   * /dev_topic - Trigger topic broadcast for current group
   */
  private async onDevTopic(ctx: BotContext) {
    if (!configService.devMode) {
      await ctx.reply(DEV_DISABLED_MESSAGE);
      return;
    }

    try {
      if (!ctx.chat) {
        await ctx.reply('This command is only available in groups');
        return;
      }

      const group = await groupService.findGroupByTelegramId(ctx.chat.id);
      if (!group) {
        await ctx.reply('Group not registered. Use /start first.');
        return;
      }

      // Check if current week already has an active/pending topic
      const existingTopic = await weeklyTopicService.findActiveTopicForGroup(group._id);

      if (existingTopic) {
        // Mark existing topic as completed for testing purposes
        await weeklyTopicService.updateTopicStatus(existingTopic._id, WeeklyTopicStatus.COMPLETED);
        await ctx.reply(
          `✅ Previous topic "${
            existingTopic.topicName || 'Pending selection'
          }" marked as completed.\nGenerating new topic...`
        );
      }

      // Use processRequestWithLoader for the entire topic generation process
      const result = await processRequestWithLoader(
        ctx,
        (async () => {
          // Get previous topics for context
          const previousTopics = await weeklyTopicService.getPreviousTopicsForGroup(group._id, 10);

          // Generate AI suggestions
          const aiSuggestions = await aiService.generateTopicSuggestions(previousTopics, 5);

          // Calculate start and end dates (Monday 9 AM to Sunday 9 PM)
          const now = new Date();
          const startDate = new Date(now);
          startDate.setHours(9, 0, 0, 0);

          const endDate = new Date(startDate);
          endDate.setDate(endDate.getDate() + 6); // Sunday
          endDate.setHours(21, 0, 0, 0); // 9 PM

          // Create weekly topic
          const weeklyTopic = await weeklyTopicService.createWeeklyTopic({
            groupId: group._id,
            startDate,
            endDate,
            aiSuggestions,
          });

          if (!weeklyTopic) {
            throw new Error('Failed to create weekly topic');
          }

          // Update group's active topic reference
          await groupService.updateActiveWeeklyTopic(group._id, weeklyTopic._id);

          return { aiSuggestions, weeklyTopic };
        })(),
        'Generating AI topic suggestions...'
      );

      // Format suggestions message
      const message = formatTopicBroadcastMessage(result.aiSuggestions);

      // Send message to group
      await ctx.reply(message, { parse_mode: 'Markdown' });

      logger.info(`[DEV] Topic broadcast sent to group ${group.telegramGroupId}`);
    } catch (error) {
      logger.error(`[DEV] Error in dev_topic: ${error}`);
      await ctx.reply(`Error: ${error}`);
    }
  }

  /**
   * /dev_vocab - Trigger vocabulary broadcast for current group
   */
  private async onDevVocab(ctx: BotContext) {
    if (!configService.devMode) {
      await ctx.reply(DEV_DISABLED_MESSAGE);
      return;
    }

    try {
      if (!ctx.chat) {
        await ctx.reply('This command is only available in groups');
        return;
      }

      const group = await groupService.findGroupByTelegramId(ctx.chat.id);
      if (!group) {
        await ctx.reply('Group not registered. Use /start first.');
        return;
      }

      // Get active topic for this group
      const activeTopic = await weeklyTopicService.findActiveTopicForGroup(group._id);

      if (!activeTopic || activeTopic.status !== 'active') {
        await ctx.reply('No active topic for this group. Select a topic first using /topic');
        return;
      }

      // Use processRequestWithLoader for the entire vocabulary generation process
      const result = await processRequestWithLoader(
        ctx,
        (async () => {
          // Get previous words for this topic
          const previousWords = await vocabularyService.getPreviousWordsForTopic(activeTopic._id);

          // Generate vocabulary using AI
          const vocabularyData = await aiService.generateVocabulary(activeTopic.topicName, previousWords);

          // Save vocabulary to database
          const vocabulary = await vocabularyService.createVocabulary({
            topicId: activeTopic._id,
            groupId: group._id,
            word: vocabularyData.word,
            vietnameseMeaning: vocabularyData.vietnameseMeaning,
            englishSynonyms: vocabularyData.englishSynonyms,
            pronunciation: vocabularyData.pronunciation,
            exampleUsages: vocabularyData.exampleUsages,
            broadcastDate: new Date(),
          });

          if (!vocabulary) {
            throw new Error('Failed to create vocabulary');
          }

          return { vocabularyData, vocabulary };
        })(),
        `Generating vocabulary for topic "${activeTopic.topicName}"...`
      );

      // Format vocabulary message
      const message = formatVocabularyMessage(result.vocabularyData);

      // Send message to group
      const sentMessage = await ctx.reply(message, { parse_mode: 'Markdown' });

      // Update vocabulary with broadcast message ID for reply detection
      await vocabularyService.updateBroadcastMessageId(result.vocabulary._id, sentMessage.message_id);

      logger.info(
        `[DEV] Vocabulary broadcast sent to group ${group.telegramGroupId}, word: ${result.vocabularyData.word}`
      );
    } catch (error) {
      logger.error(`[DEV] Error in dev_vocab: ${error}`);
      await ctx.reply(`Error: ${error}`);
    }
  }

  /**
   * /dev_eval - Trigger evaluation for current group
   */
  private async onDevEval(ctx: BotContext) {
    if (!configService.devMode) {
      await ctx.reply(DEV_DISABLED_MESSAGE);
      return;
    }

    try {
      if (!ctx.chat) {
        await ctx.reply('This command is only available in groups');
        return;
      }

      const group = await groupService.findGroupByTelegramId(ctx.chat.id);
      if (!group) {
        await ctx.reply('Group not registered. Use /start first.');
        return;
      }

      // Get pending responses for today filtered by this group
      const allPendingResponses = await userResponseService.findPendingResponsesForToday();
      const pendingResponses = allPendingResponses.filter((r) => r.groupId.toString() === group._id.toString());

      if (pendingResponses.length === 0) {
        await ctx.reply('No pending responses to evaluate for this group today.');
        return;
      }

      await ctx.reply(`Found ${pendingResponses.length} pending responses. Starting evaluation...`);

      const evaluatedResponses: Array<{ userId: number; sentence: string; score: number; feedback: string }> = [];

      // Fetch user information for all responders
      const allUserIds = pendingResponses.map((r) => r.userId);
      const allUsers = await userService.findUsersByTelegramIds(allUserIds);
      const userMap = new Map(allUsers.map((u) => [u.telegramUserId, u]));

      // Evaluate each response with loading indicator
      for (let i = 0; i < pendingResponses.length; i++) {
        const response = pendingResponses[i];
        try {
          // vocabularyId is populated by the query
          const vocabulary = response.vocabularyId as unknown as IVocabulary;

          // Get user display name
          const username = userService.getDisplayName(userMap.get(response.userId) || null, response.userId);

          // Use processRequestWithLoader for each evaluation
          const evaluation = await processRequestWithLoader(
            ctx,
            aiService.evaluateSentence(vocabulary.word, response.sentence),
            `Evaluating response ${i + 1}/${pendingResponses.length} from ${username}...`
          );

          // Update response with evaluation
          await userResponseService.updateEvaluation(response._id, evaluation);

          // Update user stats
          const weeklyTopic = await weeklyTopicService.findTopicById(vocabulary.topicId);
          if (weeklyTopic) {
            await userStatsService.upsertStats({
              userId: response.userId,
              groupId: response.groupId,
              weeklyTopicId: weeklyTopic._id,
              responsesSubmitted: 1,
              totalScore: evaluation.score,
            });
          }

          evaluatedResponses.push({
            userId: response.userId,
            sentence: response.sentence,
            score: evaluation.score,
            feedback: evaluation.feedback,
          });

          logger.info(`[DEV] Evaluated response ${response._id}: score ${evaluation.score}`);
        } catch (error) {
          logger.error(`[DEV] Error evaluating response ${response._id}: ${error}`);
          const username = userService.getDisplayName(userMap.get(response.userId) || null, response.userId);
          await ctx.reply(`⚠️ Failed to evaluate response from ${username}`);
        }
      }

      if (evaluatedResponses.length > 0) {
        // Get today's vocabulary for context
        const todayVocab = await vocabularyService.getTodayVocabulary(group._id);

        // Sort responses by score
        evaluatedResponses.sort((a, b) => b.score - a.score);

        // Format leaderboard with usernames
        const topResponses = evaluatedResponses.slice(0, 5);
        const leaderboardText = formatDailyEvaluationMessage({
          word: todayVocab?.word,
          topResponses: topResponses.map((r) => ({
            userId: r.userId,
            username: userService.getDisplayName(userMap.get(r.userId) || null, r.userId),
            score: r.score,
          })),
        });

        // Send leaderboard
        await ctx.reply(leaderboardText, { parse_mode: 'Markdown' });

        // Find non-responders (users who participated before but not today)
        const activeTopic = await weeklyTopicService.findActiveTopicForGroup(group._id);
        if (activeTopic && todayVocab) {
          const allParticipants = await userStatsService.getParticipantsForWeek(activeTopic._id);
          const todayResponders = new Set(evaluatedResponses.map((r) => r.userId));
          const nonResponders = allParticipants.filter((p) => !todayResponders.has(p.userId));

          if (nonResponders.length > 0) {
            // Apply penalty
            for (const nonResponder of nonResponders) {
              await userStatsService.upsertStats({
                userId: nonResponder.userId,
                groupId: group._id,
                weeklyTopicId: activeTopic._id,
                penaltyCount: 1,
              });
            }

            const reminderText = formatReminderMessage(nonResponders.length);
            await ctx.reply(reminderText, { parse_mode: 'Markdown' });
          }
        }
      }

      logger.info(`[DEV] Evaluation completed for group ${group.telegramGroupId}`);
    } catch (error) {
      logger.error(`[DEV] Error in dev_eval: ${error}`);
      await ctx.reply(`Error: ${error}`);
    }
  }

  /**
   * /dev_summary - Trigger weekly summary for current group
   */
  private async onDevSummary(ctx: BotContext) {
    if (!configService.devMode) {
      await ctx.reply(DEV_DISABLED_MESSAGE);
      return;
    }

    try {
      if (!ctx.chat) {
        await ctx.reply('This command is only available in groups');
        return;
      }

      await ctx.reply('Generating weekly summary for this group...');

      const group = await groupService.findGroupByTelegramId(ctx.chat.id);
      if (!group) {
        await ctx.reply('Group not registered. Use /start first.');
        return;
      }

      // Get active topic for this group
      const activeTopic = await weeklyTopicService.findActiveTopicForGroup(group._id);

      if (!activeTopic || activeTopic.status !== 'active') {
        await ctx.reply('No active topic for this group to summarize.');
        return;
      }

      // Get all vocabularies for this topic
      const vocabularies = await vocabularyService.getVocabulariesForTopic(activeTopic._id);

      // Get all responses for this topic
      const vocabularyIds = vocabularies.map((v) => v._id);
      const allResponses = await userResponseService.getResponsesForWeeklyTopic(group._id, vocabularyIds);

      // Get leaderboard
      const leaderboard = await userStatsService.getLeaderboard(activeTopic._id, 10);

      // Calculate participation stats
      const totalDays = vocabularies.length;
      const totalResponses = allResponses.length;
      const uniqueParticipants = new Set(allResponses.map((r) => r.userId)).size;
      const avgScore =
        totalResponses > 0 ? allResponses.reduce((sum, r) => sum + (r.score || 0), 0) / totalResponses : 0;

      // Fetch user information for top performers
      const userIds = leaderboard.map((stats) => stats.userId);
      const users = await userService.findUsersByTelegramIds(userIds);
      const userMap = new Map(users.map((u) => [u.telegramUserId, u]));

      // Format weekly summary with usernames
      const summaryText = formatWeeklySummaryMessage({
        topicName: activeTopic.topicName,
        startDate: activeTopic.startDate,
        endDate: activeTopic.endDate,
        totalDays,
        totalResponses,
        uniqueParticipants,
        avgScore,
        topPerformers: leaderboard.map((stats) => ({
          userId: stats.userId,
          username: userService.getDisplayName(userMap.get(stats.userId) || null, stats.userId),
          totalScore: stats.totalScore,
          responsesSubmitted: stats.responsesSubmitted,
        })),
        vocabularies,
      });

      // Send summary
      await ctx.reply(summaryText, { parse_mode: 'Markdown' });

      // Mark topic as completed
      await weeklyTopicService.updateTopicStatus(activeTopic._id, WeeklyTopicStatus.COMPLETED);

      // Clear group's active topic reference
      await groupService.updateActiveWeeklyTopic(group._id, null);

      await ctx.reply('Weekly topic marked as completed.');

      logger.info(`[DEV] Weekly summary sent and topic completed for group ${group.telegramGroupId}`);
    } catch (error) {
      logger.error(`[DEV] Error in dev_summary: ${error}`);
      await ctx.reply(`Error: ${error}`);
    }
  }
}

export const devCommand = new DevCommand();
