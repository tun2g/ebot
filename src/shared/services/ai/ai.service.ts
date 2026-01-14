import { AIProvider } from './ai.interface';
import { GeminiProvider } from './gemini.provider';

class AIService {
  private provider: AIProvider;

  constructor() {
    this.provider = new GeminiProvider();
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
}

export const aiService = new AIService();
