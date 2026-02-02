import mongoose from 'mongoose';
import { IUserResponse, UserResponse } from 'src/database/models/user-response.model';
import logger from 'src/shared/logger/logger';

export class UserResponseService {
  /**
   * Create a new user response
   */
  async createResponse(data: {
    userId: number;
    groupId: mongoose.Types.ObjectId;
    vocabularyId: mongoose.Types.ObjectId;
    sentence: string;
  }): Promise<IUserResponse | null> {
    try {
      const response = new UserResponse({
        ...data,
        submittedAt: new Date(),
      });

      return await response.save();
    } catch (error) {
      logger.error(`Error creating user response: ${error}`);
      return null;
    }
  }

  /**
   * Find pending responses for a specific vocabulary
   */
  async findPendingResponsesForVocabulary(vocabularyId: mongoose.Types.ObjectId): Promise<IUserResponse[]> {
    try {
      return await UserResponse.find({
        vocabularyId,
        evaluatedAt: null,
      });
    } catch (error) {
      logger.error(`Error finding pending responses: ${error}`);
      return [];
    }
  }

  /**
   * Find all pending responses for today (for daily evaluation job)
   */
  async findPendingResponsesForToday(): Promise<IUserResponse[]> {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      return await UserResponse.find({
        submittedAt: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
        evaluatedAt: null,
      }).populate('vocabularyId');
    } catch (error) {
      logger.error(`Error finding pending responses for today: ${error}`);
      return [];
    }
  }

  /**
   * Update response with evaluation results
   */
  async updateEvaluation(
    responseId: mongoose.Types.ObjectId,
    evaluation: {
      score: number;
      feedback: string;
      breakdown: {
        grammar: number;
        usage: number;
        complexity: number;
      };
    }
  ): Promise<IUserResponse | null> {
    try {
      return await UserResponse.findByIdAndUpdate(
        responseId,
        {
          $set: {
            score: evaluation.score,
            feedback: evaluation.feedback,
            breakdown: evaluation.breakdown,
            evaluatedAt: new Date(),
          },
        },
        { new: true, runValidators: true }
      );
    } catch (error) {
      logger.error(`Error updating evaluation: ${error}`);
      return null;
    }
  }

  /**
   * Get evaluated responses for a group today (for leaderboard)
   */
  async getEvaluatedResponsesForToday(groupId: mongoose.Types.ObjectId): Promise<IUserResponse[]> {
    try {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      return await UserResponse.find({
        groupId,
        submittedAt: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
        evaluatedAt: { $ne: null },
      }).sort({ score: -1 });
    } catch (error) {
      logger.error(`Error getting evaluated responses for today: ${error}`);
      return [];
    }
  }

  /**
   * Check if user has already responded to a vocabulary
   */
  async hasUserResponded(userId: number, vocabularyId: mongoose.Types.ObjectId): Promise<boolean> {
    try {
      const response = await UserResponse.findOne({ userId, vocabularyId });
      return !!response;
    } catch (error) {
      logger.error(`Error checking if user responded: ${error}`);
      return false;
    }
  }

  /**
   * Get all responses for a weekly topic
   */
  async getResponsesForWeeklyTopic(
    groupId: mongoose.Types.ObjectId,
    vocabularyIds: mongoose.Types.ObjectId[]
  ): Promise<IUserResponse[]> {
    try {
      return await UserResponse.find({
        groupId,
        vocabularyId: { $in: vocabularyIds },
        evaluatedAt: { $ne: null },
      });
    } catch (error) {
      logger.error(`Error getting responses for weekly topic: ${error}`);
      return [];
    }
  }
}

export const userResponseService = new UserResponseService();
