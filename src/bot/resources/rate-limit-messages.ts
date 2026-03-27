export const RATE_LIMIT_MESSAGES = {
  RATE_LIMITED: (retryAfterSeconds: number) =>
    `⏳ *Slow down!*\n\n` +
    `You're sending requests too fast. Please wait *${retryAfterSeconds} seconds* before trying again.\n\n` +
    `_This limit helps keep the bot running smoothly for everyone._`,
};
