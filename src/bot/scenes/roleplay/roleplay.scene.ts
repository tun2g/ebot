import axios from 'axios';
import { processRequestWithLoader } from 'src/bot/helper/process-request.helper';
import { BotContext } from 'src/bot/interface/context';
import { RATE_LIMIT_MESSAGES } from 'src/bot/resources/rate-limit-messages';
import { ROLEPLAY_MESSAGES, ROLEPLAY_SCENARIOS } from 'src/bot/resources/roleplay-messages';
import logger from 'src/shared/logger/logger';
import { ChatMessage } from 'src/shared/services/ai/ai.interface';
import { aiService } from 'src/shared/services/ai/ai.service';
import { rateLimitService } from 'src/shared/services/rate-limit.service';
import { Markup, Scenes } from 'telegraf';

const MAX_HISTORY = 20;

export const ROLEPLAY_SCENE_ID = 'roleplay';
export const ROLEPLAY_SCENARIO_CALLBACK_PREFIX = 'rp_scenario:';

const roleplayScene = new Scenes.BaseScene<BotContext>(ROLEPLAY_SCENE_ID);

roleplayScene.enter(async (ctx) => {
  ctx.scene.session.conversationHistory = [];
  ctx.scene.session.roleplayScenario = undefined;
  ctx.scene.session.roleplayWaitingCustom = false;

  logger.info(`[Roleplay] Scene entered - UserID: ${ctx.from?.id}`);

  // Build scenario selection keyboard
  const buttons = ROLEPLAY_SCENARIOS.map((s) => [
    Markup.button.callback(`${s.emoji} ${s.label}`, `${ROLEPLAY_SCENARIO_CALLBACK_PREFIX}${s.id}`),
  ]);

  await ctx.reply(ROLEPLAY_MESSAGES.WELCOME, {
    parse_mode: 'Markdown',
    ...Markup.inlineKeyboard(buttons),
  });
});

// Handle scenario selection callback
roleplayScene.action(new RegExp(`^${ROLEPLAY_SCENARIO_CALLBACK_PREFIX}(.+)$`), async (ctx) => {
  const scenarioId = ctx.match[1];
  const scenario = ROLEPLAY_SCENARIOS.find((s) => s.id === scenarioId);

  if (!scenario) {
    await ctx.answerCbQuery('⚠️ Unknown scenario');
    return;
  }

  await ctx.answerCbQuery(`${scenario.emoji} ${scenario.label}`);

  // Handle custom scenario - ask user to type it
  if (scenarioId === 'custom') {
    ctx.scene.session.roleplayWaitingCustom = true;
    await ctx.reply(ROLEPLAY_MESSAGES.CUSTOM_PROMPT, { parse_mode: 'Markdown' });
    return;
  }

  // For random, pick one (excluding random and custom)
  const finalScenario =
    scenarioId === 'random'
      ? ROLEPLAY_SCENARIOS.filter((s) => s.id !== 'random' && s.id !== 'custom')[
          Math.floor(Math.random() * (ROLEPLAY_SCENARIOS.length - 2))
        ]
      : scenario;

  await startRoleplay(ctx, finalScenario.label);
});

roleplayScene.command('done', async (ctx) => {
  logger.info(`[Roleplay] User exited scene - UserID: ${ctx.from?.id}`);
  await ctx.reply(ROLEPLAY_MESSAGES.FAREWELL, { parse_mode: 'Markdown' });
  await ctx.scene.leave();
});

roleplayScene.on('text', async (ctx) => {
  const userMessage = ctx.message.text;

  // Don't process other commands inside the scene
  if (userMessage.startsWith('/')) {
    await ctx.reply('⚠️ Use /done to exit the roleplay first, then use other commands.');
    return;
  }

  // If waiting for custom scenario input
  if (ctx.scene.session.roleplayWaitingCustom) {
    ctx.scene.session.roleplayWaitingCustom = false;
    await startRoleplay(ctx, userMessage);
    return;
  }

  const scenario = ctx.scene.session.roleplayScenario;
  if (!scenario) {
    await ctx.reply(ROLEPLAY_MESSAGES.ERROR_NO_SCENARIO, { parse_mode: 'Markdown' });
    return;
  }

  await handleRoleplayMessage(ctx, userMessage);
});

// Handle voice messages in roleplay
roleplayScene.on('voice', async (ctx) => {
  const scenario = ctx.scene.session.roleplayScenario;
  if (!scenario) {
    await ctx.reply(ROLEPLAY_MESSAGES.ERROR_NO_SCENARIO, { parse_mode: 'Markdown' });
    return;
  }

  // Rate limit check
  const rateCheck = await rateLimitService.checkRateLimit(ctx.from!.id, 'roleplay', 10, 60);
  if (!rateCheck.allowed) {
    await ctx.reply(RATE_LIMIT_MESSAGES.RATE_LIMITED(rateCheck.retryAfterSeconds), { parse_mode: 'Markdown' });
    return;
  }

  try {
    const voiceFile = ctx.message.voice;

    logger.info(`[Roleplay] Processing voice - UserID: ${ctx.from.id}, FileID: ${voiceFile.file_id}`);

    // Download the voice file
    const fileLink = await ctx.telegram.getFileLink(voiceFile.file_id);
    const response = await axios.get(fileLink.toString(), { responseType: 'arraybuffer' });
    const audioBuffer = Buffer.from(response.data);

    logger.info(`[Roleplay] Audio downloaded - Size: ${audioBuffer.length} bytes`);

    // Transcribe: use voice pronunciation evaluation to get transcription
    const transcription = await processRequestWithLoader(
      ctx,
      aiService.evaluateVoicePronunciation(audioBuffer, 'audio/ogg', ''),
      '🎤 Transcribing your voice...'
    );

    const userText = transcription.transcription;

    logger.info(`[Roleplay] Transcription: "${userText}"`);

    // Now use the transcribed text in roleplay
    const history: ChatMessage[] = ctx.scene.session.conversationHistory || [];
    history.push({ role: 'user', content: userText });

    const trimmedHistory = history.length > MAX_HISTORY ? history.slice(history.length - MAX_HISTORY) : history;

    const result = await processRequestWithLoader(
      ctx,
      aiService.roleplayChat(scenario, trimmedHistory),
      '🎭 Thinking...'
    );

    // Format with transcription shown
    const responseText = ROLEPLAY_MESSAGES.VOICE_RESPONSE_TEMPLATE(userText, result.languageFeedback, result.reply);

    try {
      await ctx.reply(responseText, { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply(responseText);
    }

    trimmedHistory.push({ role: 'assistant', content: result.reply });
    ctx.scene.session.conversationHistory = trimmedHistory;

    logger.info(`[Roleplay] Voice message processed - UserID: ${ctx.from?.id}, HistoryLen: ${trimmedHistory.length}`);
  } catch (error) {
    logger.error(`[Roleplay] Error processing voice - UserID: ${ctx.from?.id}, Error: ${error}`);

    const errorMessage =
      error instanceof Error && error.message.includes('not supported')
        ? ROLEPLAY_MESSAGES.ERROR_VOICE_NOT_SUPPORTED
        : ROLEPLAY_MESSAGES.ERROR;

    await ctx.reply(errorMessage, { parse_mode: 'Markdown' });
  }
});

roleplayScene.leave(async (ctx) => {
  ctx.scene.session.conversationHistory = undefined;
  ctx.scene.session.roleplayScenario = undefined;
  ctx.scene.session.roleplayWaitingCustom = undefined;
});

// --- Helper functions ---

async function startRoleplay(ctx: BotContext, scenarioLabel: string) {
  ctx.scene.session.roleplayScenario = scenarioLabel;
  ctx.scene.session.conversationHistory = [];

  await ctx.reply(ROLEPLAY_MESSAGES.SCENARIO_SELECTED(scenarioLabel), { parse_mode: 'Markdown' });

  try {
    const openingMessage: ChatMessage[] = [{ role: 'user', content: '[START]' }];

    const result = await processRequestWithLoader(
      ctx,
      aiService.roleplayChat(scenarioLabel, openingMessage),
      '🎭 Setting up the scene...'
    );

    try {
      await ctx.reply(`🎭 ${result.reply}`, { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply(`🎭 ${result.reply}`);
    }

    ctx.scene.session.conversationHistory = [
      { role: 'user', content: '[START]' },
      { role: 'assistant', content: result.reply },
    ];

    logger.info(`[Roleplay] Scenario started - UserID: ${ctx.from?.id}, Scenario: "${scenarioLabel}"`);
  } catch (error) {
    logger.error(`[Roleplay] Error generating opening: ${error}`);
    await ctx.reply(ROLEPLAY_MESSAGES.ERROR, { parse_mode: 'Markdown' });
  }
}

async function handleRoleplayMessage(ctx: BotContext, userMessage: string) {
  const scenario = ctx.scene.session.roleplayScenario!;

  // Rate limit check
  const rateCheck = await rateLimitService.checkRateLimit(ctx.from!.id, 'roleplay', 10, 60);
  if (!rateCheck.allowed) {
    await ctx.reply(RATE_LIMIT_MESSAGES.RATE_LIMITED(rateCheck.retryAfterSeconds), { parse_mode: 'Markdown' });
    return;
  }

  try {
    const history: ChatMessage[] = ctx.scene.session.conversationHistory || [];
    history.push({ role: 'user', content: userMessage });

    const trimmedHistory = history.length > MAX_HISTORY ? history.slice(history.length - MAX_HISTORY) : history;

    const result = await processRequestWithLoader(
      ctx,
      aiService.roleplayChat(scenario, trimmedHistory),
      '🎭 Thinking...'
    );

    const responseText = ROLEPLAY_MESSAGES.RESPONSE_TEMPLATE(result.languageFeedback, result.reply);

    try {
      await ctx.reply(responseText, { parse_mode: 'Markdown' });
    } catch {
      await ctx.reply(responseText);
    }

    trimmedHistory.push({ role: 'assistant', content: result.reply });
    ctx.scene.session.conversationHistory = trimmedHistory;

    logger.info(`[Roleplay] Message processed - UserID: ${ctx.from?.id}, HistoryLen: ${trimmedHistory.length}`);
  } catch (error) {
    logger.error(`[Roleplay] Error processing message - UserID: ${ctx.from?.id}, Error: ${error}`);
    await ctx.reply(ROLEPLAY_MESSAGES.ERROR, { parse_mode: 'Markdown' });
  }
}

export { roleplayScene };
