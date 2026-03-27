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

export interface VoicePracticeResult {
  sentence: string;
  tip: string; // A pronunciation tip or context for the sentence
}

export interface VoicePronunciationResult {
  transcription: string; // What the AI heard
  score: number; // 0-10 overall
  feedback: string; // Overall summary
  breakdown: {
    accuracy: { score: number; comment: string }; // 0-4, how close to the expected sentence
    fluency: { score: number; comment: string }; // 0-3, natural flow and rhythm
    intonation: { score: number; comment: string }; // 0-3, stress and intonation patterns
  };
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIProvider {
  generateTopicSuggestions(previousTopics: string[], count: number): Promise<string[]>;
  generateVocabulary(topic: string, previousWords: string[]): Promise<VocabularyData>;
  evaluateSentence(word: string, sentence: string): Promise<EvaluationResult>;
  generateVoiceSentence(topic?: string): Promise<VoicePracticeResult>;
  evaluateVoicePronunciation(
    audioBuffer: Buffer,
    mimeType: string,
    expectedSentence: string
  ): Promise<VoicePronunciationResult>;
  chat(messages: ChatMessage[]): Promise<string>;
}
