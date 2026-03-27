import { VOICE_HEAR_CALLBACK } from 'src/bot/commands/voice/voice.command';
import { processRequestWithLoader } from 'src/bot/helper/process-request.helper';
import { BotContext } from 'src/bot/interface/context';
import logger from 'src/shared/logger/logger';
import { aiService } from 'src/shared/services/ai/ai.service';
import { rateLimitService } from 'src/shared/services/rate-limit.service';
import { redisService } from 'src/shared/services/redis.service';
import { sessionService } from 'src/shared/services/session.service';

export const VOCAB_PRONOUNCE_PREFIX = 'vocab_pronounce:';
const VOCAB_AUDIO_CACHE_PREFIX = 'vocab_audio:';
const VOCAB_AUDIO_CACHE_TTL = 60 * 60 * 24 * 10; // 10 days

export class VoiceActionHandler {
  private actionsMap: Map<string | RegExp, (ctx: BotContext) => void>;

  constructor() {
    this.actionsMap = new Map<string | RegExp, (ctx: BotContext) => void>();
  }

  register() {
    this.actionsMap.set(VOICE_HEAR_CALLBACK, this.onHearPronunciation.bind(this));
    this.actionsMap.set(/^vocab_pronounce:(.+)$/, this.onVocabPronunciation.bind(this));
    return this.actionsMap;
  }

  /**
   * Handle "Hear pronunciation" for /voice practice sentences.
   * Caches the audio file ID in session so subsequent clicks reuse it.
   */
  private async onHearPronunciation(ctx: BotContext) {
    try {
      // Rate limit check
      const rateCheck = await rateLimitService.checkRateLimit(ctx.from!.id, 'voice_tts', 10, 60);
      if (!rateCheck.allowed) {
        await ctx.answerCbQuery('⏳ Too many requests. Please wait.');
        return;
      }

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

  /**
   * Handle "Hear pronunciation" for daily vocabulary words.
   * Caches the audio file ID in Redis (shared across all users) for 24 hours.
   */
  private async onVocabPronunciation(ctx: BotContext) {
    try {
      // Rate limit check
      const rateCheck = await rateLimitService.checkRateLimit(ctx.from!.id, 'voice_tts', 10, 60);
      if (!rateCheck.allowed) {
        await ctx.answerCbQuery('⏳ Too many requests. Please wait.');
        return;
      }

      if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) {
        return;
      }

      const match = ctx.callbackQuery.data.match(/^vocab_pronounce:(.+)$/);
      if (!match) return;

      const word = match[1];
      const cacheKey = `${VOCAB_AUDIO_CACHE_PREFIX}${word}`;

      // Check Redis cache for previously generated audio file ID
      const cachedFileId = await redisService.get(cacheKey);
      if (cachedFileId) {
        await ctx.answerCbQuery('🔊 Sending audio...');
        await ctx.replyWithAudio(cachedFileId);
        return;
      }

      // Generate TTS
      await ctx.answerCbQuery('🔊 Generating audio...');

      const audioBuffer = await processRequestWithLoader(
        ctx,
        aiService.generateSpeech(word),
        '🔊 Generating pronunciation...'
      );

      const audioMsg = await ctx.replyWithAudio(
        { source: audioBuffer, filename: 'pronunciation.wav' },
        { title: `🔊 ${word}`, performer: 'EBot' }
      );

      // Cache in Redis for 24 hours (shared across all users)
      await redisService.set(cacheKey, audioMsg.audio.file_id, { EX: VOCAB_AUDIO_CACHE_TTL });

      logger.info(`[Vocab TTS] Generated and cached - Word: "${word}", FileID: ${audioMsg.audio.file_id}`);
    } catch (error) {
      logger.error(`[Vocab TTS] Error: ${error}`);
      await ctx.reply('❌ Could not generate pronunciation audio. Please try again.');
    }
  }
}

export const voiceActionHandler = new VoiceActionHandler();
