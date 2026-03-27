import logger from 'src/shared/logger/logger';
import { redisService } from 'src/shared/services/redis.service';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Redis-based rate limiter using fixed window counters.
 * Key format: ratelimit:{action}:{userId}
 */
export class RateLimitService {
  /**
   * Check if a user is within the rate limit for a given action.
   * Increments the counter if allowed.
   *
   * @param userId - Telegram user ID
   * @param action - Action identifier (e.g. 'voice', 'ask', 'voice_tts')
   * @param limit - Max requests allowed in the window
   * @param windowSeconds - Time window in seconds
   */
  async checkRateLimit(userId: number, action: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const key = `ratelimit:${action}:${userId}`;

    try {
      const current = await redisService.get(key);
      const currentCount = current ? parseInt(current, 10) : 0;

      if (currentCount >= limit) {
        // Get TTL to determine retry-after
        const ttl = await redisService.ttl(key);
        const retryAfter = ttl > 0 ? ttl : windowSeconds;

        logger.warn(`[RateLimit] User ${userId} exceeded ${action} limit (${currentCount}/${limit})`);

        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: retryAfter,
        };
      }

      // Increment counter
      const newCount = await redisService.incr(key);

      // Set expiry only on first request (when counter goes from 0 to 1)
      if (newCount === 1) {
        await redisService.expire(key, windowSeconds);
      }

      return {
        allowed: true,
        remaining: limit - newCount,
        retryAfterSeconds: 0,
      };
    } catch (error) {
      // If Redis fails, allow the request to avoid blocking users
      logger.error(`[RateLimit] Redis error for ${action}:${userId}: ${error}`);
      return {
        allowed: true,
        remaining: limit,
        retryAfterSeconds: 0,
      };
    }
  }
}

export const rateLimitService = new RateLimitService();
