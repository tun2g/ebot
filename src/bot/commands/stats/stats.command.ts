import { BotContext } from 'src/bot/interface/context';
import { formatUserStatsMessage, MESSAGES } from 'src/bot/resources/learning-messages';
import { groupService } from 'src/database/services/group.service';
import { userStatsService } from 'src/database/services/user-stats.service';
import { weeklyTopicService } from 'src/database/services/weekly-topic.service';

export class StatsCommand {
  private map: Map<string, (ctx: BotContext) => void>;
  public commands = {
    stats: 'stats',
  };

  constructor() {
    this.map = new Map<string, (ctx: BotContext) => void>();
  }

  register() {
    this.map.set(this.commands.stats, this.onStats.bind(this));
    return this.map;
  }

  private async onStats(ctx: BotContext) {
    try {
      if (!ctx.chat || !ctx.from) {
        await ctx.reply(MESSAGES.STATS.UNABLE_TO_LOAD);
        return;
      }

      const group = await groupService.findGroupByTelegramId(ctx.chat.id);
      if (!group) {
        await ctx.reply(MESSAGES.ERRORS.GROUP_NOT_REGISTERED);
        return;
      }

      const activeTopic = await weeklyTopicService.findActiveTopicForGroup(group._id);

      if (!activeTopic) {
        const message = `${MESSAGES.STATS.HEADER}\n\n${MESSAGES.STATS.NO_ACTIVE_TOPIC}`;
        await ctx.reply(message, { parse_mode: 'Markdown' });
      } else {
        const stats = await userStatsService.getStatsForWeek(ctx.from.id, group._id, activeTopic._id);

        if (!stats) {
          const message = `${MESSAGES.STATS.HEADER}\n\n${MESSAGES.STATS.TOPIC_LABEL} **${activeTopic.topicName}**\n\n${MESSAGES.STATS.NOT_PARTICIPATED}`;
          await ctx.reply(message, { parse_mode: 'Markdown' });
        } else {
          const avgScore = stats.responsesSubmitted > 0 ? stats.totalScore / stats.responsesSubmitted : 0;

          // Get leaderboard position
          const leaderboard = await userStatsService.getLeaderboard(activeTopic._id, 100);
          const userId = ctx.from.id;
          const position = leaderboard.findIndex((s) => s.userId === userId) + 1;

          const message = formatUserStatsMessage({
            topicName: activeTopic.topicName,
            responsesSubmitted: stats.responsesSubmitted,
            totalScore: stats.totalScore,
            avgScore,
            penaltyCount: stats.penaltyCount,
            leaderboardPosition: position > 0 ? position : undefined,
            totalParticipants: leaderboard.length,
          });

          await ctx.reply(message, { parse_mode: 'Markdown' });
        }
      }
    } catch (error) {
      await ctx.reply(MESSAGES.STATS.ERROR);
    }
  }
}

export const statsCommand = new StatsCommand();
