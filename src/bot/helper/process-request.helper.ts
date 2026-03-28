import { BotContext } from 'src/bot/interface/context';
import { shareResource } from 'src/bot/resources/share.resource';
import type { ExtraEditMessageText } from 'telegraf/typings/telegram-types';

// Purpose: send loading stages when processing `request` function

// Mode 1: Progress bar characters
const PROGRESS_BARS = [
  '▱▱▱▱▱▱▱▱▱▱',
  '▰▱▱▱▱▱▱▱▱▱',
  '▰▰▱▱▱▱▱▱▱▱',
  '▰▰▰▱▱▱▱▱▱▱',
  '▰▰▰▰▱▱▱▱▱▱',
  '▰▰▰▰▰▱▱▱▱▱',
  '▰▰▰▰▰▰▱▱▱▱',
  '▰▰▰▰▰▰▰▱▱▱',
  '▰▰▰▰▰▰▰▰▱▱',
  '▰▰▰▰▰▰▰▰▰▱',
  '▰▰▰▰▰▰▰▰▰▰',
];

// Mode 1: Spinner for infinite loading
const SPINNER = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

// Mode 2: Emoji stages
const EMOJI_STAGES = ['🌍', '🌎', '🌏'];

// Mode 2: Emoji progress indicators
const EMOJI_PROGRESS = [
  '⚪⚪⚪⚪⚪⚪⚪⚪⚪⚪',
  '🔵⚪⚪⚪⚪⚪⚪⚪⚪⚪',
  '🔵🔵⚪⚪⚪⚪⚪⚪⚪⚪',
  '🔵🔵🔵⚪⚪⚪⚪⚪⚪⚪',
  '🔵🔵🔵🔵⚪⚪⚪⚪⚪⚪',
  '🔵🔵🔵🔵🔵⚪⚪⚪⚪⚪',
  '🔵🔵🔵🔵🔵🔵⚪⚪⚪⚪',
  '🔵🔵🔵🔵🔵🔵🔵⚪⚪⚪',
  '🔵🔵🔵🔵🔵🔵🔵🔵⚪⚪',
  '🔵🔵🔵🔵🔵🔵🔵🔵🔵⚪',
  '🔵🔵🔵🔵🔵🔵🔵🔵🔵🔵',
];

type LoaderMode = 'progress' | 'emoji';

// Randomly select a loader mode
function getRandomMode(): LoaderMode {
  return Math.random() < 0.5 ? 'progress' : 'emoji';
}

const TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes
const TIMEOUT_MESSAGE = '⏱️ Request timed out. The server took too long to respond. Please try again later.';

/**
 *
 * @param ctx
 * @param request
 * @param message
 * @param extra
 * @returns
 */
const processRequestWithLoader = async <T>(
  ctx: BotContext,
  request: Promise<T>,
  message: string = shareResource.PROCESSING_REQUEST,
  extra?: ExtraEditMessageText
) => {
  const processingMessage = await ctx.sendMessage(message);
  const chatId = processingMessage.chat.id;
  const messageId = processingMessage.message_id;

  let currentProgress = 0;
  let elapsedSeconds = 0;

  // Randomly select loader mode
  const mode: LoaderMode = getRandomMode();

  const interval = setInterval(async () => {
    elapsedSeconds++;

    // Use progress bar for first 10 seconds, then switch to spinner
    let progressIndicator: string;
    if (elapsedSeconds <= 10) {
      if (mode === 'progress') {
        progressIndicator = PROGRESS_BARS[elapsedSeconds - 1] || PROGRESS_BARS[10];
      } else {
        progressIndicator = EMOJI_PROGRESS[elapsedSeconds - 1] || EMOJI_PROGRESS[10];
      }
    } else {
      if (mode === 'progress') {
        progressIndicator = SPINNER[currentProgress++ % SPINNER.length];
      } else {
        progressIndicator = EMOJI_STAGES[currentProgress++ % EMOJI_STAGES.length];
      }
    }

    const timeInfo = elapsedSeconds <= 10 ? `${elapsedSeconds * 10}%` : `${elapsedSeconds}s`;

    if (messageId && chatId) {
      try {
        await ctx.telegram.editMessageText(
          chatId,
          messageId,
          undefined,
          `${progressIndicator} ${timeInfo}\n${message}`,
          extra
        );
      } catch (error) {
        // Ignore errors during animation updates
      }
    } else {
      await ctx.editMessageText(`${progressIndicator} ${timeInfo}\n${message}`);
    }
  }, 1000);

  // Create a timeout promise that rejects after TIMEOUT_MS
  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    setTimeout(() => {
      reject(new Error('REQUEST_TIMEOUT'));
    }, TIMEOUT_MS);
  });

  try {
    // Race the actual request against the timeout
    const result = await Promise.race([request, timeoutPromise]);
    clearInterval(interval);

    // Quickly animate to 100% completion before deleting
    if (messageId && chatId) {
      try {
        // Show 100% completion with the appropriate mode
        const completionBar = mode === 'progress' ? PROGRESS_BARS[10] : EMOJI_PROGRESS[10];
        await ctx.telegram.editMessageText(chatId, messageId, undefined, `${completionBar} 100%\n${message}`, extra);

        // Delete the loading message
        await ctx.telegram.deleteMessage(chatId, messageId);
      } catch (error) {
        // Ignore errors during cleanup
      }
    }

    return result as T;
  } catch (error) {
    clearInterval(interval);

    // Show timeout-specific message
    const isTimeout = error instanceof Error && error.message === 'REQUEST_TIMEOUT';
    const errorText = isTimeout ? TIMEOUT_MESSAGE : shareResource.ERROR_REQUEST;

    try {
      await ctx.telegram.editMessageText(chatId, messageId, undefined, errorText, undefined);
    } catch {
      // Ignore errors during error display
    }

    throw error;
  }
};

export { processRequestWithLoader };
