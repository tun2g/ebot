import axios from 'axios';
import { processRequestWithLoader } from 'src/bot/helper/process-request.helper';
import { BotContext } from 'src/bot/interface/context';
import { RATE_LIMIT_MESSAGES } from 'src/bot/resources/rate-limit-messages';
import { SHADOW_MESSAGES } from 'src/bot/resources/shadow-messages';
import logger from 'src/shared/logger/logger';
import { aiService } from 'src/shared/services/ai/ai.service';
import { rateLimitService } from 'src/shared/services/rate-limit.service';
import { sessionService } from 'src/shared/services/session.service';

export class ShadowResponseHandler {
  /**
   * Handle voice message replies for shadow practice evaluation.
   * Returns true if the message was handled, false otherwise.
   */
  async handle(ctx: BotContext): Promise<boolean> {
    try {
      if (!ctx.message || !ctx.from || !ctx.chat) {
        return false;
      }

      // Check if this is a voice or audio message
      const voice = 'voice' in ctx.message ? ctx.message.voice : undefined;
      const audio = 'audio' in ctx.message ? ctx.message.audio : undefined;
      const voiceFile = voice || audio;

      if (!voiceFile) {
        return false;
      }

      // Check if this is a reply to a message
      if (!('reply_to_message' in ctx.message) || !ctx.message.reply_to_message) {
        return false;
      }

      // Check session for shadow practice data
      const session = await sessionService.getSession(ctx);
      if (!session.shadowPracticeSentence || !session.shadowPracticeMessageId) {
        return false;
      }

      // Check if the reply is to the shadow practice message
      const replyToMessageId = ctx.message.reply_to_message.message_id;
      if (replyToMessageId !== session.shadowPracticeMessageId) {
        return false;
      }

      // Rate limit check
      const rateCheck = await rateLimitService.checkRateLimit(ctx.from.id, 'shadow', 5, 60);
      if (!rateCheck.allowed) {
        await ctx.reply(RATE_LIMIT_MESSAGES.RATE_LIMITED(rateCheck.retryAfterSeconds), { parse_mode: 'Markdown' });
        return true;
      }

      const expectedSentence = session.shadowPracticeSentence;

      logger.info(
        `[Shadow] Processing voice reply - UserID: ${ctx.from.id}, FileID: ${voiceFile.file_id}, Expected: "${expectedSentence}"`
      );

      // Download the voice file
      const fileLink = await ctx.telegram.getFileLink(voiceFile.file_id);
      const response = await axios.get(fileLink.toString(), { responseType: 'arraybuffer' });
      const audioBuffer = Buffer.from(response.data);

      // Determine MIME type
      const mimeType = voice ? 'audio/ogg' : audio?.mime_type || 'audio/ogg';

      logger.info(`[Shadow] Audio downloaded - Size: ${audioBuffer.length} bytes, MimeType: ${mimeType}`);

      // Evaluate shadowing with loading animation
      const evaluation = await processRequestWithLoader(
        ctx,
        aiService.evaluateShadowing(audioBuffer, mimeType, expectedSentence),
        '🔄 Analyzing your shadowing...'
      );

      // Send evaluation result
      try {
        await ctx.reply(SHADOW_MESSAGES.EVALUATION_TEMPLATE(evaluation), {
          parse_mode: 'Markdown',
          reply_parameters: { message_id: ctx.message.message_id },
        });
      } catch {
        await ctx.reply(SHADOW_MESSAGES.EVALUATION_TEMPLATE(evaluation), {
          reply_parameters: { message_id: ctx.message.message_id },
        });
      }

      // Clear the shadow practice session data
      await sessionService.setSession(ctx, {
        shadowPracticeSentence: undefined,
        shadowPracticeMessageId: undefined,
      });

      logger.info(
        `[Shadow] Evaluation complete - UserID: ${ctx.from.id}, Score: ${evaluation.score}/10, Transcription: "${evaluation.transcription}"`
      );

      return true;
    } catch (error) {
      logger.error(
        `[Shadow] ERROR - UserID: ${ctx.from?.id || 'N/A'}, Error: ${
          error instanceof Error ? error.message : String(error)
        }`
      );

      await ctx.reply(SHADOW_MESSAGES.ERROR_EVALUATING, {
        parse_mode: 'Markdown',
      });

      return true; // We handled it, even though it errored
    }
  }
}

export const shadowResponseHandler = new ShadowResponseHandler();
