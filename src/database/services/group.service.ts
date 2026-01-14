import mongoose from 'mongoose';

import logger from '../../shared/logger/logger';
import { Group, IGroup } from '../models/group.model';

export class GroupService {
  /**
   * Find or create group based on Telegram chat data
   */
  async findOrCreateGroup(telegramGroupId: number, groupName: string): Promise<IGroup | null> {
    try {
      const group = await Group.findOneAndUpdate(
        { telegramGroupId },
        {
          $set: {
            groupName,
          },
          $setOnInsert: {
            telegramGroupId,
            timezone: 'Asia/Ho_Chi_Minh',
          },
        },
        {
          upsert: true,
          new: true,
          runValidators: true,
        }
      );

      return group;
    } catch (error) {
      logger.error(`Error in findOrCreateGroup: ${error}`);
      return null;
    }
  }

  /**
   * Update the active weekly topic for a group
   */
  async updateActiveWeeklyTopic(
    groupId: mongoose.Types.ObjectId,
    weeklyTopicId: mongoose.Types.ObjectId | null
  ): Promise<IGroup | null> {
    try {
      return await Group.findByIdAndUpdate(
        groupId,
        { $set: { activeWeeklyTopicId: weeklyTopicId } },
        { new: true, runValidators: true }
      );
    } catch (error) {
      logger.error(`Error updating active weekly topic: ${error}`);
      return null;
    }
  }

  /**
   * Get all active groups (for job processing)
   */
  async getAllActiveGroups(): Promise<IGroup[]> {
    try {
      return await Group.find();
    } catch (error) {
      logger.error(`Error getting all active groups: ${error}`);
      return [];
    }
  }

  /**
   * Find group by Telegram group ID
   */
  async findGroupByTelegramId(telegramGroupId: number): Promise<IGroup | null> {
    try {
      return await Group.findOne({ telegramGroupId });
    } catch (error) {
      logger.error(`Error finding group ${telegramGroupId}: ${error}`);
      return null;
    }
  }
}

export const groupService = new GroupService();
