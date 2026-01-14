export interface VocabularyData {
  word: string;
  vietnameseMeaning: string;
  englishSynonyms: string[];
  pronunciation: string;
  exampleUsages: string[];
}

export interface EvaluationResult {
  score: number; // 0-10
  feedback: string;
  breakdown: {
    grammar: number; // 0-4
    usage: number; // 0-3
    complexity: number; // 0-3
  };
}

export interface AIProvider {
  generateTopicSuggestions(previousTopics: string[], count: number): Promise<string[]>;
  generateVocabulary(topic: string, previousWords: string[]): Promise<VocabularyData>;
  evaluateSentence(word: string, sentence: string): Promise<EvaluationResult>;
}
