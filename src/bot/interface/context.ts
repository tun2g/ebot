import { Scenes } from 'telegraf';

export interface BotSceneSession extends Scenes.SceneSessionData {
  conversationHistory?: { role: 'user' | 'assistant'; content: string }[];
  roleplayScenario?: string;
  roleplayWaitingCustom?: boolean;
}

/**
 * Bot context interface extending Telegraf's SceneContext
 * - ctx.scene.session.conversationHistory for scene-specific data
 * - sessionService.getSession(ctx) for custom Redis session data
 */
export type BotContext = Scenes.SceneContext<BotSceneSession>;
