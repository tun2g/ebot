import { processRequestWithLoader } from 'src/bot/helper/process-request.helper';
import { BotContext } from 'src/bot/interface/context';
import { RATE_LIMIT_MESSAGES } from 'src/bot/resources/rate-limit-messages';
import { SHADOW_MESSAGES } from 'src/bot/resources/shadow-messages';
import logger from 'src/shared/logger/logger';
import { aiService } from 'src/shared/services/ai/ai.service';
import { rateLimitService } from 'src/shared/services/rate-limit.service';
import { sessionService } from 'src/shared/services/session.service';

export class ShadowCommand {
  private map: Map<string, (ctx: BotContext) => void>;
  public commands = {
    shadow: 'shadow',
  };

  constructor() {
    this.map = new Map<string, (ctx: BotContext) => void>();
  }

  register() {
    this.map.set(this.commands.shadow, this.onShadow.bind(this));
    return this.map;
  }

  private async onShadow(ctx: BotContext) {
    try {
      // Rate limit check
      const rateCheck = await rateLimitService.checkRateLimit(ctx.from!.id, 'shadow', 5, 60);
      if (!rateCheck.allowed) {
        await ctx.reply(RATE_LIMIT_MESSAGES.RATE_LIMITED(rateCheck.retryAfterSeconds), { parse_mode: 'Markdown' });
        return;
      }

      // Step 1: Generate a sentence with loading animation
      const result = await processRequestWithLoader(
        ctx,
        aiService.generateVoiceSentence(),
        '🔁 Generating a sentence for shadowing...'
      );

      // Step 2: Generate TTS audio for the sentence
      const audioBuffer = await processRequestWithLoader(
        ctx,
        aiService.generateSpeech(result.sentence),
        '🔊 Generating native pronunciation...'
      );

      // Step 3: Send audio first (user needs to listen before reading)
      const audioMsg = await ctx.replyWithAudio(
        { source: audioBuffer, filename: 'shadow_practice.wav' },
        { title: '🔁 Shadow Practice', performer: 'EBot' }
      );

      // Step 4: Send the text + instructions (referencing the audio)
      const sentenceMessage = await ctx.reply(
        SHADOW_MESSAGES.SENTENCE_TEMPLATE(result.sentence, result.pronunciation, result.tip),
        { parse_mode: 'Markdown' }
      );

      // Store in session for the shadow response handler
      await sessionService.setSession(ctx, {
        shadowPracticeSentence: result.sentence,
        shadowPracticeMessageId: sentenceMessage.message_id,
      });

      logger.info(
        `[Shadow] Sentence generated - UserID: ${ctx.from?.id}, AudioMsgID: ${audioMsg.message_id}, TextMsgID: ${sentenceMessage.message_id}, Sentence: "${result.sentence}"`
      );
    } catch (error) {
      logger.error(`[Shadow] Error generating sentence: ${error}`);

      const errorMessage =
        error instanceof Error && error.message.includes('not supported')
          ? SHADOW_MESSAGES.ERROR_PROVIDER_NOT_SUPPORTED
          : SHADOW_MESSAGES.ERROR_GENERATING;

      await ctx.reply(errorMessage, { parse_mode: 'Markdown' });
    }
  }
}

export const shadowCommand = new ShadowCommand();
