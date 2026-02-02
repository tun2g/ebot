import mongoose from 'mongoose';
import { IWeeklyTopic, WeeklyTopic, WeeklyTopicStatus } from 'src/database/models/weekly-topic.model';
import logger from 'src/shared/logger/logger';

export class WeeklyTopicService {
  /**
   * Create a new weekly topic
   */
  async createWeeklyTopic(data: {
    groupId: mongoose.Types.ObjectId;
    startDate: Date;
    endDate: Date;
    aiSuggestions: string[];
  }): Promise<IWeeklyTopic | null> {
    try {
      const weeklyTopic = new WeeklyTopic({
        groupId: data.groupId,
        startDate: data.startDate,
        endDate: data.endDate,
        aiSuggestions: data.aiSuggestions,
        status: WeeklyTopicStatus.PENDING,
      });

      return await weeklyTopic.save();
    } catch (error) {
      logger.error(`Error creating weekly topic: ${error}`);
      return null;
    }
  }

  /**
   * Find active topic for a specific group
   */
  async findActiveTopicForGroup(groupId: mongoose.Types.ObjectId): Promise<IWeeklyTopic | null> {
    try {
      return await WeeklyTopic.findOne({
        groupId,
        status: { $in: [WeeklyTopicStatus.PENDING, WeeklyTopicStatus.ACTIVE] },
      }).sort({ startDate: -1 });
    } catch (error) {
      logger.error(`Error finding active topic for group: ${error}`);
      return null;
    }
  }

  /**
   * Find pending topic for a specific group
   */
  async findPendingTopicForGroup(groupId: mongoose.Types.ObjectId): Promise<IWeeklyTopic | null> {
    try {
      return await WeeklyTopic.findOne({
        groupId,
        status: WeeklyTopicStatus.PENDING,
      }).sort({ startDate: -1 });
    } catch (error) {
      logger.error(`Error finding pending topic for group: ${error}`);
      return null;
    }
  }

  /**
   * Update topic status and details
   */
  async updateTopicStatus(
    topicId: mongoose.Types.ObjectId,
    status: WeeklyTopicStatus,
    updates?: {
      topicName?: string;
      selectedBy?: number;
    }
  ): Promise<IWeeklyTopic | null> {
    try {
      const updateData: {
        status: WeeklyTopicStatus;
        topicName?: string;
        selectedBy?: number;
      } = { status };
      if (updates?.topicName) updateData.topicName = updates.topicName;
      if (updates?.selectedBy) updateData.selectedBy = updates.selectedBy;

      return await WeeklyTopic.findByIdAndUpdate(topicId, { $set: updateData }, { new: true, runValidators: true });
    } catch (error) {
      logger.error(`Error updating topic status: ${error}`);
      return null;
    }
  }

  /**
   * Get previous topics for a group (for AI context)
   */
  async getPreviousTopicsForGroup(groupId: mongoose.Types.ObjectId, limit = 10): Promise<string[]> {
    try {
      const topics = await WeeklyTopic.find({
        groupId,
        status: WeeklyTopicStatus.COMPLETED,
        topicName: { $ne: '' },
      })
        .sort({ endDate: -1 })
        .limit(limit)
        .select('topicName');

      return topics.map((topic) => topic.topicName);
    } catch (error) {
      logger.error(`Error getting previous topics: ${error}`);
      return [];
    }
  }

  /**
   * Find topic by ID
   */
  async findTopicById(topicId: mongoose.Types.ObjectId): Promise<IWeeklyTopic | null> {
    try {
      return await WeeklyTopic.findById(topicId);
    } catch (error) {
      logger.error(`Error finding topic by ID: ${error}`);
      return null;
    }
  }
}

export const weeklyTopicService = new WeeklyTopicService();
