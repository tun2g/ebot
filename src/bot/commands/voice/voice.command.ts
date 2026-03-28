import { processRequestWithLoader } from 'src/bot/helper/process-request.helper';
import { BotContext } from 'src/bot/interface/context';
import { RATE_LIMIT_MESSAGES } from 'src/bot/resources/rate-limit-messages';
import { VOICE_MESSAGES } from 'src/bot/resources/voice-messages';
import logger from 'src/shared/logger/logger';
import { aiService } from 'src/shared/services/ai/ai.service';
import { rateLimitService } from 'src/shared/services/rate-limit.service';
import { sessionService } from 'src/shared/services/session.service';
import { Markup } from 'telegraf';

export const VOICE_HEAR_CALLBACK = 'voice_hear_pronunciation';

export class VoiceCommand {
  private map: Map<string, (ctx: BotContext) => void>;
  public commands = {
    voice: 'voice',
  };

  constructor() {
    this.map = new Map<string, (ctx: BotContext) => void>();
  }

  register() {
    this.map.set(this.commands.voice, this.onVoice.bind(this));
    return this.map;
  }

  private async onVoice(ctx: BotContext) {
    try {
      // Rate limit check
      const rateCheck = await rateLimitService.checkRateLimit(ctx.from!.id, 'voice', 5, 60);
      if (!rateCheck.allowed) {
        await ctx.reply(RATE_LIMIT_MESSAGES.RATE_LIMITED(rateCheck.retryAfterSeconds), { parse_mode: 'Markdown' });
        return;
      }

      // Generate a sentence with loading animation
      const result = await processRequestWithLoader(
        ctx,
        aiService.generateVoiceSentence(),
        '🎙️ Generating a sentence for you...'
      );

      // Send the sentence with instructions + "Hear pronunciation" button
      const sentenceMessage = await ctx.reply(
        VOICE_MESSAGES.SENTENCE_TEMPLATE(result.sentence, result.pronunciation, result.tip),
        {
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([Markup.button.callback('🔊 Hear pronunciation', VOICE_HEAR_CALLBACK)]),
        }
      );

      // Store the sentence and message ID in session for the voice response handler
      await sessionService.setSession(ctx, {
        voicePracticeSentence: result.sentence,
        voicePracticeMessageId: sentenceMessage.message_id,
        voicePracticeAudioFileId: undefined,
      });

      logger.info(
        `[Voice] Sentence generated - UserID: ${ctx.from?.id}, MessageID: ${sentenceMessage.message_id}, Sentence: "${result.sentence}"`
      );
    } catch (error) {
      logger.error(`[Voice] Error generating sentence: ${error}`);

      const errorMessage =
        error instanceof Error && error.message.includes('not supported')
          ? VOICE_MESSAGES.ERROR_PROVIDER_NOT_SUPPORTED
          : VOICE_MESSAGES.ERROR_GENERATING;

      await ctx.reply(errorMessage, { parse_mode: 'Markdown' });
    }
  }
}

export const voiceCommand = new VoiceCommand();
