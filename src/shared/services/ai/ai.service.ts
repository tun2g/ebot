import { configService } from 'src/configs/configuration';
import { AIProvider } from 'src/shared/services/ai/ai.interface';
import { FuseProvider } from 'src/shared/services/ai/fuse.provider';
import { GeminiProvider } from 'src/shared/services/ai/gemini.provider';

class AIService {
  private provider: AIProvider;

  constructor() {
    const providerType = configService.ai.provider.toLowerCase();

    switch (providerType) {
      case 'fuse':
        this.provider = new FuseProvider();
        break;
      case 'gemini':
        this.provider = new GeminiProvider();
        break;
      default:
        // Default to Gemini for backward compatibility
        this.provider = new GeminiProvider();
    }
  }

  async generateTopicSuggestions(previousTopics: string[] = [], count = 5) {
    return this.provider.generateTopicSuggestions(previousTopics, count);
  }

  async generateVocabulary(topic: string, previousWords: string[] = []) {
    return this.provider.generateVocabulary(topic, previousWords);
  }

  async evaluateSentence(word: string, sentence: string) {
    return this.provider.evaluateSentence(word, sentence);
  }

  async generateVoiceSentence(topic?: string) {
    return this.provider.generateVoiceSentence(topic);
  }

  async evaluateVoicePronunciation(audioBuffer: Buffer, mimeType: string, expectedSentence: string) {
    return this.provider.evaluateVoicePronunciation(audioBuffer, mimeType, expectedSentence);
  }

  async chat(messages: import('src/shared/services/ai/ai.interface').ChatMessage[]) {
    return this.provider.chat(messages);
  }

  async generateSpeech(text: string) {
    return this.provider.generateSpeech(text);
  }
}

export const aiService = new AIService();
