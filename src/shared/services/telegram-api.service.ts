import axios from 'axios';
import { InlineKeyboardMarkup, Message } from 'telegraf/types';

import { configService } from '../../configs/configuration';
import logger from '../logger/logger';

export class TelegramApiService {
  private botToken: string;
  private telegramApiUrl: string;
  private botApiUrl: string;

  constructor() {
    this.botToken = configService.botToken;
    this.telegramApiUrl = configService.telegramApiUrl;
    this.botApiUrl = `${this.telegramApiUrl}/bot${this.botToken}`;
  }

  async sendMessage(
    chatId: number,
    text: string,
    markup: InlineKeyboardMarkup,
    parseMode: 'Markdown' | 'html' = 'Markdown',
  ) {
    try {
      const response = await axios.post(`${this.botApiUrl}/sendMessage`, {
        chat_id: chatId,
        text,
        reply_markup: markup,
        parse_mode: parseMode,
      });
      return response?.data?.result as Message;
    } catch (error) {
      logger.error(error);
      throw Error(`Cannot send message: ${error.message}`);
    }
  }

  async editMessageReplyMarkup(chatId: number, messageId: number, markup: InlineKeyboardMarkup) {
    try {
      const response = await axios.post(`${this.botApiUrl}/editMessageReplyMarkup`, {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: markup,
      });
      return response?.data?.result as Message;
    } catch (error) {
      logger.error(error);
      throw Error(`Cannot edit message: ${error.message}`);
    }
  }

  async editMessageText(
    chatId: number,
    messageId: number,
    text: string,
    markup: InlineKeyboardMarkup,
  ) {
    await axios.post(`${this.botApiUrl}/editMessageText`, {
      message_id: messageId,
      chat_id: chatId,
      text,
      reply_markup: markup,
      parse_mode: 'MarkdownV2',
    });
  }

  async setMyCommands(commands: { command: string; description: string }[]) {
    try {
      await axios.post(`${this.botApiUrl}/setMyCommands`, {
        commands,
      });
    } catch (error) {
      logger.error(error);
      throw Error(`Cannot set my commands: ${error.message}`);
    }
  }
}

export const telegramApiService = new TelegramApiService();
