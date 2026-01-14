import mongoose from 'mongoose';

import { WeeklyTopicStatus } from '../../../database/models/weekly-topic.model';
import { weeklyTopicService } from '../../../database/services/weekly-topic.service';
import logger from '../../../shared/logger/logger';
import { BotContext } from '../../interface/context';
import { learningMenu } from './learning.menu';

export class LearningMenuActionHandler {
  private actionsMap: Map<string | RegExp, (ctx: BotContext) => void>;

  constructor() {
    this.actionsMap = new Map<string | RegExp, (ctx: BotContext) => void>();
  }

  register() {
    // Regex pattern to match topic selection callbacks
    this.actionsMap.set(/^selectTopic_(.+)_(\d+)$/, this.selectTopic);
    return this.actionsMap;
  }

  /**
   * Handle topic selection from edit menu
   */
  private async selectTopic(ctx: BotContext) {
    try {
      if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        return;
      }

      const match = ctx.callbackQuery.data.match(/^selectTopic_(.+)_(\d+)$/);
      if (!match) return;

      const topicId = new mongoose.Types.ObjectId(match[1]);
      const selectedIndex = parseInt(match[2]);

      const topic = await weeklyTopicService.findTopicById(topicId);

      if (!topic) {
        await ctx.answerCbQuery('Topic not found');
        return;
      }

      if (selectedIndex < 0 || selectedIndex >= topic.aiSuggestions.length) {
        await ctx.answerCbQuery('Invalid topic selection');
        return;
      }

      const selectedTopicName = topic.aiSuggestions[selectedIndex];

      // Update topic
      await weeklyTopicService.updateTopicStatus(topicId, WeeklyTopicStatus.ACTIVE, {
        topicName: selectedTopicName,
        selectedBy: ctx.from?.id,
      });

      const message = `✅ **Topic Updated!**\n\nNew topic: **${selectedTopicName}**\n\nThis topic will guide vocabulary learning for the rest of the week.`;

      const now = new Date();
      const isMonday = now.getDay() === 1;

      await ctx.editMessageText(message, {
        parse_mode: 'Markdown',
        ...learningMenu.replyMarkup(isMonday),
      });

      await ctx.answerCbQuery('Topic updated successfully!');

      logger.info(`Topic ${topicId} updated to: ${selectedTopicName} by user ${ctx.from?.id}`);
    } catch (error) {
      logger.error(`Error in selectTopic: ${error}`);
      await ctx.answerCbQuery('Error updating topic');
    }
  }
}

export const learningMenuActionHandler = new LearningMenuActionHandler();
