export interface VocabularyData {
  word: string;
  vietnameseMeaning: string;
  englishSynonyms: string[];
  pronunciation: string;
  exampleUsages: string[];
}

export interface EvaluationResult {
  score: number; // 0-10
  feedback: string; // Overall summary in Vietnamese
  breakdown: {
    grammar: { score: number; comment: string }; // 0-4, explain why
    usage: { score: number; comment: string }; // 0-3, explain why
    complexity: { score: number; comment: string }; // 0-3, explain why
  };
}

export interface AIProvider {
  generateTopicSuggestions(previousTopics: string[], count: number): Promise<string[]>;
  generateVocabulary(topic: string, previousWords: string[]): Promise<VocabularyData>;
  evaluateSentence(word: string, sentence: string): Promise<EvaluationResult>;
}
