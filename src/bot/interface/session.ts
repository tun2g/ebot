import { CurrentAction } from 'src/bot/constants/current-action';

// userId:chatId
export interface BotSession {
  currentAction?: CurrentAction;
  voicePracticeSentence?: string;
  voicePracticeMessageId?: number;
  voicePracticeAudioFileId?: string;
  shadowPracticeSentence?: string;
  shadowPracticeMessageId?: number;
}

export const defaultSession: BotSession = {
  currentAction: undefined,
  voicePracticeSentence: undefined,
  voicePracticeMessageId: undefined,
  voicePracticeAudioFileId: undefined,
  shadowPracticeSentence: undefined,
  shadowPracticeMessageId: undefined,
};
