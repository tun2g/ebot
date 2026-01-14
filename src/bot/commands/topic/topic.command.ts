import { Markup } from 'telegraf';

import { groupService } from '../../../database/services/group.service';
import { vocabularyService } from '../../../database/services/vocabulary.service';
import { weeklyTopicService } from '../../../database/services/weekly-topic.service';
import { BotContext } from '../../interface/context';
import { formatCurrentTopicMessage, formatPendingTopicMessage, MESSAGES } from '../../resources/learning-messages';

export class TopicCommand {
  private map: Map<string, (ctx: BotContext) => void>;
  public commands = {
    topic: 'topic',
  };

  constructor() {
    this.map = new Map<string, (ctx: BotContext) => void>();
  }

  register() {
    this.map.set(this.commands.topic, this.onTopic);
    return this.map;
  }

  private async onTopic(ctx: BotContext) {
    try {
      if (!ctx.chat) {
        await ctx.reply(MESSAGES.TOPIC.GROUP_ONLY);
        return;
      }

      const group = await groupService.findGroupByTelegramId(ctx.chat.id);
      if (!group) {
        await ctx.reply(MESSAGES.TOPIC.NOT_REGISTERED);
        return;
      }

      const activeTopic = await weeklyTopicService.findActiveTopicForGroup(group._id);

      if (!activeTopic) {
        const message = `${MESSAGES.TOPIC.HEADER}\n\n${MESSAGES.TOPIC.NO_ACTIVE_TOPIC}`;
        await ctx.reply(message, { parse_mode: 'Markdown' });
      } else if (activeTopic.status === 'pending') {
        const message = formatPendingTopicMessage(activeTopic.aiSuggestions);

        // Check if it's Monday to allow editing
        const now = new Date();
        const isMonday = now.getDay() === 1;

        if (isMonday) {
          const buttons = activeTopic.aiSuggestions.map((topic, index) => [
            Markup.button.callback(`${index + 1}. ${topic}`, `selectTopic_${activeTopic._id}_${index}`),
          ]);

          await ctx.reply(message, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard(buttons),
          });
        } else {
          await ctx.reply(message, { parse_mode: 'Markdown' });
        }
      } else {
        // Get vocabularies covered so far
        const vocabularies = await vocabularyService.getVocabulariesForTopic(activeTopic._id);

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
      await ctx.reply(MESSAGES.TOPIC.ERROR);
    }
  }
}

export const topicCommand = new TopicCommand();
