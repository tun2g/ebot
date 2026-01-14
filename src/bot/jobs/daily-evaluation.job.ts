import Bull from 'bull';

import { IVocabulary } from '../../database/models/vocabulary.model';
import { groupService } from '../../database/services/group.service';
import { userResponseService } from '../../database/services/user-response.service';
import { userStatsService } from '../../database/services/user-stats.service';
import { vocabularyService } from '../../database/services/vocabulary.service';
import { weeklyTopicService } from '../../database/services/weekly-topic.service';
import logger from '../../shared/logger/logger';
import { aiService } from '../../shared/services/ai/ai.service';
import { bot } from '../index';
import { formatDailyEvaluationMessage, formatReminderMessage } from '../resources/learning-messages';

export async function dailyEvaluationJob(_job: Bull.Job) {
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

        // Format leaderboard
        const leaderboardText = formatDailyEvaluationMessage({
          word: todayVocab?.word,
          topResponses: responses.slice(0, 5),
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

    logger.info('Daily evaluation job completed');
  } catch (error) {
    logger.error(`Daily evaluation job failed: ${error}`);
    throw error;
  }
}
