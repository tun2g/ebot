import { CurrentAction } from '../constants/current-action';

// userId:chatId
export interface BotSession {
  currentAction?: CurrentAction;
}

export const defaultSession: BotSession = {
  currentAction: undefined,
};
