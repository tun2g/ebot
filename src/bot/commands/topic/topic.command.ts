import { processRequestWithLoader } from 'src/bot/helper/process-request.helper';
import { BotContext } from 'src/bot/interface/context';
import { formatCurrentTopicMessage, formatPendingTopicMessage, MESSAGES } from 'src/bot/resources/learning-messages';
import { groupService } from 'src/database/services/group.service';
import { vocabularyService } from 'src/database/services/vocabulary.service';
import { weeklyTopicService } from 'src/database/services/weekly-topic.service';
import logger from 'src/shared/logger/logger';
import { aiService } from 'src/shared/services/ai/ai.service';
import { Markup } from 'telegraf';

export class TopicCommand {
  private map: Map<string, (ctx: BotContext) => void>;
  public commands = {
    topic: 'topic',
  };

  constructor() {
    this.map = new Map<string, (ctx: BotContext) => void>();
  }

  register() {
    this.map.set(this.commands.topic, this.onTopic.bind(this));
    return this.map;
  }

  private async onTopic(ctx: BotContext) {
    try {
      if (!ctx.chat) {
        await ctx.reply(MESSAGES.TOPIC.GROUP_ONLY);
        return;
      }

      logger.info(
        `[TopicCommand] /topic called - ChatID: ${ctx.chat.id}, ChatTitle: ${
          'title' in ctx.chat ? ctx.chat.title : 'N/A'
        }, UserID: ${ctx.from?.id || 'N/A'}`
      );

      // Auto-register group if not exists
      const groupName = 'title' in ctx.chat ? ctx.chat.title : `Chat ${ctx.chat.id}`;
      logger.info(`[TopicCommand] Auto-registering group - TelegramID: ${ctx.chat.id}, Name: "${groupName}"`);

      const group = await groupService.findOrCreateGroup(ctx.chat.id, groupName);
      if (!group) {
        logger.error(
          `[TopicCommand] Failed to register/find group - ChatID: ${ctx.chat.id}, GroupName: "${groupName}". This is a critical error - MongoDB may be down or there's a schema issue.`
        );
        await ctx.reply(MESSAGES.TOPIC.ERROR);
        return;
      }

      logger.info(
        `[TopicCommand] Group registered/found successfully - GroupID: ${group._id}, TelegramID: ${
          group.telegramGroupId
        }, ActiveTopicID: ${group.activeWeeklyTopicId || 'null'}`
      );

      const activeTopic = await weeklyTopicService.findActiveTopicForGroup(group._id);

      if (!activeTopic) {
        logger.info(`[TopicCommand] No active topic found for group ${group._id}. Generating new topic suggestions...`);
        // No topic exists for this week - generate suggestions and create a new one using loader
        const result = await processRequestWithLoader(
          ctx,
          (async () => {
            const previousTopics = await weeklyTopicService.getPreviousTopicsForGroup(group._id, 10);
            const aiSuggestions = await aiService.generateTopicSuggestions(previousTopics, 5);

            // Calculate week dates
            const now = new Date();
            const startDate = new Date(now);
            startDate.setHours(9, 0, 0, 0);

            // Calculate days until Sunday (0 = Sunday, so if today is Wednesday (3), we need 4 more days)
            const daysUntilSunday = (7 - now.getDay()) % 7 || 7; // If already Sunday, go to next Sunday
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + daysUntilSunday);
            endDate.setHours(21, 0, 0, 0); // 9 PM

            // Create weekly topic with PENDING status
            const weeklyTopic = await weeklyTopicService.createWeeklyTopic({
              groupId: group._id,
              startDate,
              endDate,
              aiSuggestions,
            });

            if (!weeklyTopic) {
              throw new Error('Failed to create weekly topic');
            }

            logger.info(
              `[TopicCommand] Weekly topic created - TopicID: ${weeklyTopic._id}, Status: ${
                weeklyTopic.status
              }, Suggestions: [${aiSuggestions.join(', ')}]`
            );

            // Update group's active topic reference
            await groupService.updateActiveWeeklyTopic(group._id, weeklyTopic._id);

            return { aiSuggestions, weeklyTopic };
          })(),
          'Generating topic suggestions...'
        );

        // Display topic suggestions with selection buttons
        const message = formatPendingTopicMessage(result.aiSuggestions);
        const buttons = result.aiSuggestions.map((topic, index) => [
          Markup.button.callback(`${index + 1}. ${topic}`, `selectTopic_${result.weeklyTopic._id}_${index}`),
        ]);

        await ctx.reply(message, {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard(buttons),
        });

        logger.info(
          `[TopicCommand] Topic suggestions sent - TopicID: ${result.weeklyTopic._id}, GroupID: ${group._id}, SuggestionsCount: ${result.aiSuggestions.length}`
        );
      } else if (activeTopic.status === 'pending') {
        logger.info(
          `[TopicCommand] Pending topic exists - TopicID: ${
            activeTopic._id
          }, Suggestions: [${activeTopic.aiSuggestions.join(', ')}]`
        );
        const message = formatPendingTopicMessage(activeTopic.aiSuggestions);

        // Check if it's Monday to allow editing
        const now = new Date();
        const isMonday = now.getDay() === 1;

        if (isMonday) {
          logger.info(`[TopicCommand] It's Monday - showing editable topic suggestions`);
          const buttons = activeTopic.aiSuggestions.map((topic, index) => [
            Markup.button.callback(`${index + 1}. ${topic}`, `selectTopic_${activeTopic._id}_${index}`),
          ]);

          await ctx.reply(message, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(buttons),
          });
        } else {
          logger.info(`[TopicCommand] Not Monday - showing read-only topic suggestions`);
          await ctx.reply(message, { parse_mode: 'Markdown' });
        }
      } else {
        logger.info(
          `[TopicCommand] Active topic exists - TopicID: ${activeTopic._id}, TopicName: "${activeTopic.topicName}", Status: ${activeTopic.status}`
        );
        // Get vocabularies covered so far
        const vocabularies = await vocabularyService.getVocabulariesForTopic(activeTopic._id);

        logger.info(
          `[TopicCommand] Vocabularies for topic - Count: ${vocabularies.length}, Words: [${vocabularies
            .map((v) => v.word)
            .join(', ')}]`
        );

        const message = formatCurrentTopicMessage({
          topicName: activeTopic.topicName,
          status: activeTopic.status as 'active' | 'pending',
          startDate: activeTopic.startDate,
          endDate: activeTopic.endDate,
          vocabularies: vocabularies.length > 0 ? vocabularies : undefined,
        });

        await ctx.reply(message, { parse_mode: 'Markdown' });
      }
    } catch (error) {
      logger.error(
        `[TopicCommand] ERROR in onTopic - ChatID: ${ctx.chat?.id || 'N/A'}, Error: ${
          error instanceof Error ? error.message : String(error)
        }, Stack: ${error instanceof Error ? error.stack : 'N/A'}`
      );
      await ctx.reply(MESSAGES.TOPIC.ERROR);
    }
  }
}

export const topicCommand = new TopicCommand();
