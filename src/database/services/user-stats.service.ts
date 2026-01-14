import mongoose from 'mongoose';

import logger from '../../shared/logger/logger';
import { IUserStats, UserStats } from '../models/user-stats.model';

export class UserStatsService {
  /**
   * Upsert user stats (create or update)
   */
  async upsertStats(data: {
    userId: number;
    groupId: mongoose.Types.ObjectId;
    weeklyTopicId: mongoose.Types.ObjectId;
    responsesSubmitted?: number;
    penaltyCount?: number;
    totalScore?: number;
  }): Promise<IUserStats | null> {
    try {
      const { userId, groupId, weeklyTopicId, ...updates } = data;

      // Build increment object
      const incrementData: Record<string, number> = {};
      if (updates.responsesSubmitted !== undefined) {
        incrementData.responsesSubmitted = updates.responsesSubmitted;
      }
      if (updates.penaltyCount !== undefined) {
        incrementData.penaltyCount = updates.penaltyCount;
      }
      if (updates.totalScore !== undefined) {
        incrementData.totalScore = updates.totalScore;
      }

      const stats = await UserStats.findOneAndUpdate(
        { userId, groupId, weeklyTopicId },
        {
          $inc: incrementData,
          $setOnInsert: {
            userId,
            groupId,
            weeklyTopicId,
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );

      return stats;
    } catch (error) {
      logger.error(`Error upserting user stats: ${error}`);
      return null;
    }
  }

  /**
   * Get stats for a user in a specific week
   */
  async getStatsForWeek(
    userId: number,
    groupId: mongoose.Types.ObjectId,
    weeklyTopicId: mongoose.Types.ObjectId
  ): Promise<IUserStats | null> {
    try {
      return await UserStats.findOne({ userId, groupId, weeklyTopicId });
    } catch (error) {
      logger.error(`Error getting stats for week: ${error}`);
      return null;
    }
  }

  /**
   * Get leaderboard for a weekly topic
   */
  async getLeaderboard(weeklyTopicId: mongoose.Types.ObjectId, limit = 10): Promise<IUserStats[]> {
    try {
      return await UserStats.find({ weeklyTopicId }).sort({ totalScore: -1, responsesSubmitted: -1 }).limit(limit);
    } catch (error) {
      logger.error(`Error getting leaderboard: ${error}`);
      return [];
    }
  }

  /**
   * Get all users who participated in a weekly topic
   */
  async getParticipantsForWeek(weeklyTopicId: mongoose.Types.ObjectId): Promise<IUserStats[]> {
    try {
      return await UserStats.find({ weeklyTopicId });
    } catch (error) {
      logger.error(`Error getting participants for week: ${error}`);
      return [];
    }
  }

  /**
   * Get user IDs who have responded today
   */
  async getUsersWhoRespondedToday(
    _groupId: mongoose.Types.ObjectId,
    _weeklyTopicId: mongoose.Types.ObjectId
  ): Promise<number[]> {
    try {
      // This will be called after daily evaluation
      // We'll track this via user responses instead
      return [];
    } catch (error) {
      logger.error(`Error getting users who responded today: ${error}`);
      return [];
    }
  }
}

export const userStatsService = new UserStatsService();
