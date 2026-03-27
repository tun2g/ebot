import { VOICE_HEAR_CALLBACK } from 'src/bot/commands/voice/voice.command';
import { processRequestWithLoader } from 'src/bot/helper/process-request.helper';
import { BotContext } from 'src/bot/interface/context';
import logger from 'src/shared/logger/logger';
import { aiService } from 'src/shared/services/ai/ai.service';
import { sessionService } from 'src/shared/services/session.service';

export class VoiceActionHandler {
  private actionsMap: Map<string | RegExp, (ctx: BotContext) => void>;

  constructor() {
    this.actionsMap = new Map<string | RegExp, (ctx: BotContext) => void>();
  }

  register() {
    this.actionsMap.set(VOICE_HEAR_CALLBACK, this.onHearPronunciation.bind(this));
    return this.actionsMap;
  }

  /**
   * Handle "Hear pronunciation" button click - generates TTS audio on demand.
   * Caches the audio file ID in session so subsequent clicks reuse it.
   */
  private async onHearPronunciation(ctx: BotContext) {
    try {
      const session = await sessionService.getSession(ctx);
      const sentence = session.voicePracticeSentence;

      if (!sentence) {
        await ctx.answerCbQuery('⚠️ No active sentence. Use /voice first.');
        return;
      }

      // If we already have a cached audio file, reuse it
      if (session.voicePracticeAudioFileId) {
        await ctx.answerCbQuery('🔊 Sending audio...');
        await ctx.replyWithAudio(session.voicePracticeAudioFileId);
        return;
      }

      // First time: generate TTS and cache
      await ctx.answerCbQuery('🔊 Generating audio...');

      const audioBuffer = await processRequestWithLoader(
        ctx,
        aiService.generateSpeech(sentence),
        '🔊 Generating pronunciation guide...'
      );

      const audioMsg = await ctx.replyWithAudio(
        { source: audioBuffer, filename: 'pronunciation.wav' },
        { title: '🔊 Pronunciation Guide', performer: 'EBot' }
      );

      // Cache the Telegram file_id for subsequent clicks
      await sessionService.setSession(ctx, {
        ...session,
        voicePracticeAudioFileId: audioMsg.audio.file_id,
      });

      logger.info(`[Voice TTS] Generated and cached - UserID: ${ctx.from?.id}, FileID: ${audioMsg.audio.file_id}`);
    } catch (error) {
      logger.error(`[Voice TTS] Error: ${error}`);
      await ctx.reply('❌ Could not generate pronunciation audio. Please try again.');
    }
  }
}

export const voiceActionHandler = new VoiceActionHandler();
