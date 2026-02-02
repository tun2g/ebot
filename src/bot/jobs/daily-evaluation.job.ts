import Bull from 'bull';
import { bot } from 'src/bot/index';
import { formatDailyEvaluationMessage, formatReminderMessage } from 'src/bot/resources/learning-messages';
import { IVocabulary } from 'src/database/models/vocabulary.model';
import { groupService } from 'src/database/services/group.service';
import { userService } from 'src/database/services/user.service';
import { userResponseService } from 'src/database/services/user-response.service';
import { userStatsService } from 'src/database/services/user-stats.service';
import { vocabularyService } from 'src/database/services/vocabulary.service';
import { weeklyTopicService } from 'src/database/services/weekly-topic.service';
import logger from 'src/shared/logger/logger';
import { aiService } from 'src/shared/services/ai/ai.service';

export async function dailyEvaluationJob(_job: Bull.Job) {
  const startTime = new Date();
  logger.info(`🚀 CRONJOB STARTED: Daily Evaluation | ${startTime.toISOString()} (${startTime.toLocaleString()})`);

  try {
    logger.info('Starting daily evaluation job');

    // Get all pending responses for today
    const pendingResponses = await userResponseService.findPendingResponsesForToday();

    logger.info(`Found ${pendingResponses.length} pending responses to evaluate`);

    // Group responses by group for reporting
    const responsesByGroup: Map<
      string,
      Array<{ userId: number; sentence: string; score: number; feedback: string }>
    > = new Map();

    // Evaluate each response
    for (const response of pendingResponses) {
      try {
        // vocabularyId is populated by the query in findPendingResponsesForToday
        const vocabulary = response.vocabularyId as unknown as IVocabulary;

        // Call AI to evaluate
        const evaluation = await aiService.evaluateSentence(vocabulary.word, response.sentence);

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

        // Group responses by group for leaderboard
        const groupKey = response.groupId.toString();
        if (!responsesByGroup.has(groupKey)) {
          responsesByGroup.set(groupKey, []);
        }
        const groupResponses = responsesByGroup.get(groupKey);
        if (groupResponses) {
          groupResponses.push({
            userId: response.userId,
            sentence: response.sentence,
            score: evaluation.score,
            feedback: evaluation.feedback,
          });
        }

        logger.info(`Evaluated response ${response._id}: score ${evaluation.score}`);
      } catch (error) {
        logger.error(`Error evaluating response ${response._id}: ${error}`);
      }
    }

    // Send daily leaderboard to each group
    for (const [groupIdStr, responses] of responsesByGroup.entries()) {
      try {
        const group = await groupService.getAllActiveGroups();
        const targetGroup = group.find((g) => g._id.toString() === groupIdStr);

        if (!targetGroup) continue;

        // Get today's vocabulary for context
        const todayVocab = await vocabularyService.getTodayVocabulary(targetGroup._id);

        // Sort responses by score
        responses.sort((a, b) => b.score - a.score);

        // Fetch user information for top responders
        const topResponses = responses.slice(0, 5);
        const userIds = topResponses.map((r) => r.userId);
        const users = await userService.findUsersByTelegramIds(userIds);
        const userMap = new Map(users.map((u) => [u.telegramUserId, u]));

        // Format leaderboard with usernames
        const leaderboardText = formatDailyEvaluationMessage({
          word: todayVocab?.word,
          topResponses: topResponses.map((r) => ({
            userId: r.userId,
            username: userService.getDisplayName(userMap.get(r.userId) || null, r.userId),
            score: r.score,
          })),
        });

        // Send leaderboard
        await bot.telegram.sendMessage(targetGroup.telegramGroupId, leaderboardText, {
          parse_mode: 'Markdown',
        });

        logger.info(`Sent daily leaderboard to group ${targetGroup.telegramGroupId}`);

        // Find non-responders (users who participated before but not today)
        const activeTopic = await weeklyTopicService.findActiveTopicForGroup(targetGroup._id);
        if (activeTopic && todayVocab) {
          const allParticipants = await userStatsService.getParticipantsForWeek(activeTopic._id);
          const todayResponders = new Set(responses.map((r) => r.userId));
          const nonResponders = allParticipants.filter((p) => !todayResponders.has(p.userId));

          if (nonResponders.length > 0) {
            // Send reminder (update penalty)
            for (const nonResponder of nonResponders) {
              await userStatsService.upsertStats({
                userId: nonResponder.userId,
                groupId: targetGroup._id,
                weeklyTopicId: activeTopic._id,
                penaltyCount: 1,
              });
            }

            const reminderText = formatReminderMessage(nonResponders.length);
            await bot.telegram.sendMessage(targetGroup.telegramGroupId, reminderText, {
              parse_mode: 'Markdown',
            });
          }
        }
      } catch (error) {
        logger.error(`Error sending leaderboard to group ${groupIdStr}: ${error}`);
      }
    }

    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    logger.info('Daily evaluation job completed');
    logger.info(
      `✅ CRONJOB COMPLETED: Daily Evaluation | Duration: ${duration}ms (${(duration / 1000).toFixed(
        2
      )}s) | ${endTime.toISOString()}`
    );
  } catch (error) {
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    logger.error(`Daily evaluation job failed: ${error}`);
    logger.error(
      `❌ CRONJOB FAILED: Daily Evaluation | Duration: ${duration}ms (${(duration / 1000).toFixed(
        2
      )}s) | Error: ${error}`
    );
    throw error;
  }
}
