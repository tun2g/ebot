/**
 * BotContext provide userId, chatId in each user context with Telegram Bot
 * This function return { userId, chatId, type} from the user context
 * @param ctx BotContext
 * @returns
 */
const getIdsInTelegramContext = (ctx) => {
  const userId = ctx.update.message?.from?.id || ctx.update.callback_query?.from?.id;
  const chatId = ctx.update.message?.chat?.id || ctx.update.callback_query?.message?.chat?.id;
  const type = ctx.update.callback_query?.from
    ? 'callback_query'
    : ctx.message?.web_app_data?.data
    ? 'web_app'
    : 'message';
  return {
    userId,
    chatId,
    type,
  } as {
    userId: number;
    chatId: number;
    type: 'message' | 'callback_query';
  };
};

/**
 * Purpose: Telegram Markdown required "\\" before specials characters in text message sent to Telegram
 * @param text string
 * @returns {string}
 */
const formatMD = (text: string) => {
  if (!text) return '';
  return text.replace('.', '\\.').replace('-', '\\-');
};

const isNumber = (value: string): boolean => !isNaN(Number(value));

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const formatDisplayDate = (isoString: string) => {
  const date = new Date(isoString);

  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();

  const formattedDate = `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`;
  return formattedDate;
};

export { formatDisplayDate, formatMD, getIdsInTelegramContext, isNumber, sleep };
