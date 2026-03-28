import { BotContext } from 'src/bot/interface/context';
import { formatTopicSelectedMessage, MESSAGES } from 'src/bot/resources/learning-messages';
import { sendVocabularyToGroup } from 'src/bot/utils/send-vocabulary.util';
import { WeeklyTopicStatus } from 'src/database/models/weekly-topic.model';
import { groupService } from 'src/database/services/group.service';
import { weeklyTopicService } from 'src/database/services/weekly-topic.service';
import logger from 'src/shared/logger/logger';

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

      logger.info(
        `[TopicSelection] Processing message - ChatID: ${ctx.chat.id}, UserID: ${ctx.from.id}, Username: ${
          ctx.from.username || 'N/A'
        }, Text: "${ctx.message.text}"`
      );

      // Get the group
      const group = await groupService.findGroupByTelegramId(ctx.chat.id);
      if (!group) {
        logger.warn(
          `[TopicSelection] Group not found - ChatID: ${ctx.chat.id}. Topic selection ignored. Group should have been registered.`
        );
        return false;
      }

      logger.info(
        `[TopicSelection] Group found - GroupID: ${group._id}, TelegramID: ${group.telegramGroupId}, checking for pending topic...`
      );

      // Check if there's a pending topic for this group
      const pendingTopic = await weeklyTopicService.findPendingTopicForGroup(group._id);
      if (!pendingTopic) {
        logger.info(
          `[TopicSelection] No pending topic found for group ${group._id}. This is not a topic selection message.`
        );
        return false;
      }

      logger.info(
        `[TopicSelection] Pending topic found - TopicID: ${
          pendingTopic._id
        }, Suggestions: [${pendingTopic.aiSuggestions.join(', ')}]`
      );

      // Parse the user's response (should be a number 1-5)
      const text = ctx.message.text.trim();
      const selectedNumber = parseInt(text);

      if (isNaN(selectedNumber) || selectedNumber < 1 || selectedNumber > 5) {
        logger.info(
          `[TopicSelection] Invalid number format - Text: "${text}", ParsedNumber: ${selectedNumber}. Not a topic selection.`
        );
        // Not a valid topic selection, let other handlers process it
        return false;
      }

      const selectedIndex = selectedNumber - 1;
      if (selectedIndex >= pendingTopic.aiSuggestions.length) {
        logger.warn(
          `[TopicSelection] Number out of range - SelectedNumber: ${selectedNumber}, TotalSuggestions: ${pendingTopic.aiSuggestions.length}`
        );
        await ctx.reply(MESSAGES.TOPIC_SELECTION.INVALID_NUMBER);
        return true;
      }

      const selectedTopicName = pendingTopic.aiSuggestions[selectedIndex];

      logger.info(
        `[TopicSelection] Valid selection - SelectedNumber: ${selectedNumber}, SelectedTopic: "${selectedTopicName}", Updating topic status...`
      );

      // Update the topic
      await weeklyTopicService.updateTopicStatus(pendingTopic._id, WeeklyTopicStatus.ACTIVE, {
        topicName: selectedTopicName,
        selectedBy: ctx.from.id,
      });

      // Update group's active topic reference
      await groupService.updateActiveWeeklyTopic(group._id, pendingTopic._id);

      // Send confirmation
      const selectedBy = `@${ctx.from.username || ctx.from.first_name}`;
      const isMonday = new Date().getDay() === 1;
      const startTimeText = isMonday ? 'shortly' : 'tomorrow at 9 AM';
      const message = formatTopicSelectedMessage(selectedTopicName, selectedBy, startTimeText);
      await ctx.reply(message, { parse_mode: 'Markdown' });

      logger.info(
        `[TopicSelection] Topic selection completed successfully - GroupID: ${group._id}, TopicID: ${pendingTopic._id}, TopicName: "${selectedTopicName}", SelectedBy: ${ctx.from.id} (${selectedBy})`
      );

      // On Monday, immediately send the first vocabulary word
      if (isMonday) {
        logger.info(
          `[TopicSelection] Monday detected - sending first vocabulary immediately for group ${group.telegramGroupId}`
        );
        await sendVocabularyToGroup(group._id, group.telegramGroupId, pendingTopic._id, selectedTopicName);
      }

      return true;
    } catch (error) {
      logger.error(
        `[TopicSelection] ERROR in handle - ChatID: ${ctx.chat?.id || 'N/A'}, UserID: ${
          ctx.from?.id || 'N/A'
        }, Error: ${error instanceof Error ? error.message : String(error)}, Stack: ${
          error instanceof Error ? error.stack : 'N/A'
        }`
      );
      return false;
    }
  }
}

export const topicSelectionHandler = new TopicSelectionHandler();
