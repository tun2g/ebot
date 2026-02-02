import { BotContext } from 'src/bot/interface/context';

/**
 * Implement your auth requirement here if needed
 * For example: verify user exists or check permissions
 *
 * const session = await sessionService.getSession(ctx);
 * const user = await userService.findUserByTelegramId(ctx.from?.id);
 * if(!user){
 *   await ctx.reply('Please register first')
 *   return;
 * }
 */
export const authMiddleware = async (_ctx: BotContext, next: () => Promise<void>) => next();
