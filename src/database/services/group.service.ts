import mongoose from 'mongoose';
import { Group, IGroup } from 'src/database/models/group.model';
import logger from 'src/shared/logger/logger';

export class GroupService {
  /**
   * Find or create group based on Telegram chat data
   */
  async findOrCreateGroup(telegramGroupId: number, groupName: string): Promise<IGroup | null> {
    try {
      logger.info(
        `[GroupService] BEFORE findOrCreateGroup - TelegramID: ${telegramGroupId}, GroupName: "${groupName}"`
      );

      // Check if group exists first
      const existingGroup = await Group.findOne({ telegramGroupId });
      if (existingGroup) {
        logger.info(
          `[GroupService] Group already exists - ID: ${existingGroup._id}, TelegramID: ${telegramGroupId}, Name: "${existingGroup.groupName}"`
        );
      } else {
        logger.info(`[GroupService] Group not found, will create new - TelegramID: ${telegramGroupId}`);
      }

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

      if (group) {
        logger.info(
          `[GroupService] AFTER findOrCreateGroup - SUCCESS - ID: ${group._id}, TelegramID: ${
            group.telegramGroupId
          }, Name: "${group.groupName}", ActiveTopicID: ${group.activeWeeklyTopicId || 'null'}`
        );
      } else {
        logger.error(
          `[GroupService] AFTER findOrCreateGroup - FAILED - Result is null for TelegramID: ${telegramGroupId}`
        );
      }

      return group;
    } catch (error) {
      logger.error(
        `[GroupService] ERROR in findOrCreateGroup - TelegramID: ${telegramGroupId}, GroupName: "${groupName}", Error: ${
          error instanceof Error ? error.message : String(error)
        }, Stack: ${error instanceof Error ? error.stack : 'N/A'}`
      );
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
      logger.info(
        `[GroupService] BEFORE updateActiveWeeklyTopic - GroupID: ${groupId}, NewTopicID: ${weeklyTopicId || 'null'}`
      );

      const updatedGroup = await Group.findByIdAndUpdate(
        groupId,
        { $set: { activeWeeklyTopicId: weeklyTopicId } },
        { new: true, runValidators: true }
      );

      if (updatedGroup) {
        logger.info(
          `[GroupService] AFTER updateActiveWeeklyTopic - SUCCESS - GroupID: ${updatedGroup._id}, TelegramID: ${
            updatedGroup.telegramGroupId
          }, ActiveTopicID: ${updatedGroup.activeWeeklyTopicId || 'null'}`
        );
      } else {
        logger.error(`[GroupService] AFTER updateActiveWeeklyTopic - FAILED - Group not found with ID: ${groupId}`);
      }

      return updatedGroup;
    } catch (error) {
      logger.error(
        `[GroupService] ERROR in updateActiveWeeklyTopic - GroupID: ${groupId}, TopicID: ${weeklyTopicId}, Error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
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
      logger.info(`[GroupService] BEFORE findGroupByTelegramId - TelegramID: ${telegramGroupId}`);

      const group = await Group.findOne({ telegramGroupId });

      if (group) {
        logger.info(
          `[GroupService] AFTER findGroupByTelegramId - FOUND - ID: ${group._id}, TelegramID: ${
            group.telegramGroupId
          }, Name: "${group.groupName}", ActiveTopicID: ${group.activeWeeklyTopicId || 'null'}`
        );
      } else {
        logger.warn(
          `[GroupService] AFTER findGroupByTelegramId - NOT FOUND - TelegramID: ${telegramGroupId}. This group may not be registered. Consider calling findOrCreateGroup() instead.`
        );
      }

      return group;
    } catch (error) {
      logger.error(
        `[GroupService] ERROR in findGroupByTelegramId - TelegramID: ${telegramGroupId}, Error: ${
          error instanceof Error ? error.message : String(error)
        }, Stack: ${error instanceof Error ? error.stack : 'N/A'}`
      );
      return null;
    }
  }
}

export const groupService = new GroupService();
