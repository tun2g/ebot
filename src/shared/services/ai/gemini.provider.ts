import { GoogleGenerativeAI } from '@google/generative-ai';

import { configService } from '../../../configs/configuration';
import logger from '../../logger/logger';
import { AIProvider, EvaluationResult, VocabularyData } from './ai.interface';

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  constructor() {
    this.genAI = new GoogleGenerativeAI(configService.ai.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });
  }

  async generateTopicSuggestions(previousTopics: string[] = [], count = 5): Promise<string[]> {
    try {
      const previousTopicsText =
        previousTopics.length > 0 ? `\n\nPrevious topics (avoid these):\n${previousTopics.join('\n')}` : '';

      const prompt = `You are an English learning assistant. Generate ${count} engaging English learning topics for a weekly learning session.

Topics should be:
- Practical and relevant to daily life
- Suitable for intermediate English learners
- Diverse (covering different aspects: business, travel, technology, culture, etc.)
- Interesting and motivating

${previousTopicsText}

Return ONLY a JSON array of ${count} topic strings. Example format:
["Business Communication", "Travel and Tourism", "Technology and Innovation", "Cultural Celebrations", "Health and Wellness"]

JSON:`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        logger.error('Failed to parse AI response for topic suggestions');
        return this.getFallbackTopics(count);
      }

      const topics = JSON.parse(jsonMatch[0]);
      return topics.slice(0, count);
    } catch (error) {
      logger.error(`Error generating topic suggestions: ${error}`);
      return this.getFallbackTopics(count);
    }
  }

  async generateVocabulary(topic: string, previousWords: string[] = []): Promise<VocabularyData> {
    try {
      const previousWordsText =
        previousWords.length > 0 ? `\n\nPrevious words used this week (avoid these):\n${previousWords.join(', ')}` : '';

      const prompt = `You are an English learning assistant. Generate a vocabulary word for the topic "${topic}".

Requirements:
- Choose an intermediate-level English word related to "${topic}"
- Provide Vietnamese translation (nghĩa tiếng Việt)
- Include 3-4 English synonyms
- Provide IPA pronunciation guide
- Create 2-3 clear example sentences using the word

${previousWordsText}

Return ONLY a JSON object with this exact structure:
{
  "word": "example",
  "vietnameseMeaning": "ví dụ",
  "englishSynonyms": ["sample", "illustration", "instance"],
  "pronunciation": "/ɪɡˈzæmpəl/",
  "exampleUsages": [
    "Can you give me an example of how to use this word?",
    "This is a perfect example of good writing.",
    "For example, you could say it like this."
  ]
}

JSON:`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error('Failed to parse AI response for vocabulary');
        return this.getFallbackVocabulary(topic);
      }

      const vocabulary = JSON.parse(jsonMatch[0]);
      return vocabulary;
    } catch (error) {
      logger.error(`Error generating vocabulary: ${error}`);
      return this.getFallbackVocabulary(topic);
    }
  }

  async evaluateSentence(word: string, sentence: string): Promise<EvaluationResult> {
    try {
      const prompt = `You are an English language evaluator. Evaluate this sentence for its use of the target word.

Target word: "${word}"
Student's sentence: "${sentence}"

Evaluate based on:
1. Grammar (0-4 points): Grammatical correctness, sentence structure
2. Usage (0-3 points): Correct and natural use of the target word
3. Complexity (0-3 points): Sentence sophistication and vocabulary richness

Provide:
- Total score (0-10, sum of breakdown)
- Brief feedback in Vietnamese (1-2 sentences)
- Breakdown scores

Return ONLY a JSON object with this exact structure:
{
  "score": 8,
  "feedback": "Câu của bạn rất tốt! Ngữ pháp chính xác và từ được sử dụng tự nhiên.",
  "breakdown": {
    "grammar": 4,
    "usage": 3,
    "complexity": 1
  }
}

JSON:`;

      const result = await this.model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0, // Consistent evaluation
        },
      });

      const response = result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error('Failed to parse AI response for evaluation');
        return this.getFallbackEvaluation();
      }

      const evaluation = JSON.parse(jsonMatch[0]);

      // Validate scores
      evaluation.score = Math.min(10, Math.max(0, evaluation.score));
      evaluation.breakdown.grammar = Math.min(4, Math.max(0, evaluation.breakdown.grammar));
      evaluation.breakdown.usage = Math.min(3, Math.max(0, evaluation.breakdown.usage));
      evaluation.breakdown.complexity = Math.min(3, Math.max(0, evaluation.breakdown.complexity));

      return evaluation;
    } catch (error) {
      logger.error(`Error evaluating sentence: ${error}`);
      return this.getFallbackEvaluation();
    }
  }

  // Fallback methods for error cases
  private getFallbackTopics(count: number): string[] {
    const fallbackTopics = [
      'Business Communication',
      'Travel and Tourism',
      'Technology and Innovation',
      'Cultural Celebrations',
      'Health and Wellness',
      'Food and Cooking',
      'Sports and Fitness',
      'Environment and Nature',
      'Education and Learning',
      'Entertainment and Media',
    ];

    return fallbackTopics.slice(0, count);
  }

  private getFallbackVocabulary(_topic: string): VocabularyData {
    return {
      word: 'example',
      vietnameseMeaning: 'ví dụ',
      englishSynonyms: ['sample', 'illustration', 'instance'],
      pronunciation: '/ɪɡˈzæmpəl/',
      exampleUsages: [
        'Can you give me an example of how to use this word?',
        'This is a perfect example of good writing.',
        'For example, you could say it like this.',
      ],
    };
  }

  private getFallbackEvaluation(): EvaluationResult {
    return {
      score: 5,
      feedback: 'Không thể đánh giá tự động. Vui lòng thử lại sau.',
      breakdown: {
        grammar: 2,
        usage: 2,
        complexity: 1,
      },
    };
  }
}
