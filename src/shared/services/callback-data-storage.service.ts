import { Command } from 'src/bot/constants/command';
import { BotContext } from 'src/bot/interface/context';
import { redisService } from 'src/shared/services/redis.service';

export class CallbackDataStorageService {
  /**
   * @description Store the callback data of a list in redis
   * @param address: wallet address
   * @param prefix : key prefix in redis database
   * @param field: identify key of each item in hMap. E.g: token [ {id: 1 }, {id: 2} ], `field` value is `id` now
   * @param data: list of items
   */
  async hSetCallbackData<T>(address: string, prefix: string, field: string, data: T[]) {
    const redisKey = `${prefix}:${address}`;
    await Promise.all(
      data.map(async (value) => {
        await redisService.hSet(redisKey, value[field], JSON.stringify(value));
      })
    );
    await redisService.expire(redisKey, 3600);
  }

  async hGetCallbackData<T>(ctx: BotContext, address: string, prefix: string, field: string) {
    const redisKey = `${prefix}:${address}`;
    const redisValue = await redisService.hGet(redisKey, field);
    if (!redisValue) {
      await ctx.editMessageText(`🤕Something went wrong. Please ${Command.START} again to get started.`);
      throw new Error('CallbackData is expired!');
    }
    return JSON.parse(redisValue) as T;
  }

  async setCallbackData<T>(address: string, key: string, value: T) {
    const redisKey = `${key}:${address}`;
    await redisService.set(redisKey, JSON.stringify(value), { EX: 3600 });
  }

  async getCallbackData<T>(ctx: BotContext, address: string, key: string) {
    const redisKey = `${key}:${address}`;
    const redisValue = await redisService.get(redisKey);
    if (!redisValue) {
      await ctx.editMessageText(`🤕Something went wrong. Please ${Command.START} again to get started.`);
      throw new Error('CallbackData is expired!');
    }
    return JSON.parse(redisValue) as T;
  }

  async delCallbackData(address: string, prefix: string) {
    const redisKey = `${prefix}:${address}`;
    return await redisService.del(redisKey);
  }
}

export const callbackDataStorageService = new CallbackDataStorageService();
