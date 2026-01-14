import { WeeklyTopicStatus } from '../../database/models/weekly-topic.model';
import { groupService } from '../../database/services/group.service';
import { weeklyTopicService } from '../../database/services/weekly-topic.service';
import logger from '../../shared/logger/logger';
import { BotContext } from '../interface/context';
import { formatTopicSelectedMessage, MESSAGES } from '../resources/learning-messages';

export class TopicSelectionHandler {
  async handle(ctx: BotContext): Promise<boolean> {
    try {
      // Check if this is a reply to a message
      if (!ctx.message || !('reply_to_message' in ctx.message) || !ctx.message.reply_to_message) {
        return false;
      }

      // Check if this is a text message
      if (!('text' in ctx.message)) {
        return false;
      }

      if (!ctx.chat || !ctx.from) {
        return false;
      }

      // Get the group
      const group = await groupService.findGroupByTelegramId(ctx.chat.id);
      if (!group) {
        return false;
      }

      // Check if there's a pending topic for this group
      const pendingTopic = await weeklyTopicService.findPendingTopicForGroup(group._id);
      if (!pendingTopic) {
        return false;
      }

      // Parse the user's response (should be a number 1-5)
      const text = ctx.message.text.trim();
      const selectedNumber = parseInt(text);

      if (isNaN(selectedNumber) || selectedNumber < 1 || selectedNumber > 5) {
        // Not a valid topic selection, let other handlers process it
        return false;
      }

      const selectedIndex = selectedNumber - 1;
      if (selectedIndex >= pendingTopic.aiSuggestions.length) {
        await ctx.reply(MESSAGES.TOPIC_SELECTION.INVALID_NUMBER);
        return true;
      }

      const selectedTopicName = pendingTopic.aiSuggestions[selectedIndex];

      // Update the topic
      await weeklyTopicService.updateTopicStatus(pendingTopic._id, WeeklyTopicStatus.ACTIVE, {
        topicName: selectedTopicName,
        selectedBy: ctx.from.id,
      });

      // Update group's active topic reference
      await groupService.updateActiveWeeklyTopic(group._id, pendingTopic._id);

      // Send confirmation
      const selectedBy = `@${ctx.from.username || ctx.from.first_name}`;
      const message = formatTopicSelectedMessage(selectedTopicName, selectedBy, 'tomorrow at 9 AM');
      await ctx.reply(message, { parse_mode: 'Markdown' });

      logger.info(`Topic selected for group ${ctx.chat.id}: ${selectedTopicName} by user ${ctx.from.id}`);

      return true;
    } catch (error) {
      logger.error(`Error in topic selection handler: ${error}`);
      return false;
    }
  }
}

export const topicSelectionHandler = new TopicSelectionHandler();
