import { BotContext } from '../interface/context';

export const authMiddleware = async (ctx: BotContext, next) => {
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
  next();
};
