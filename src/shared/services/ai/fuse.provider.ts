import { configService } from 'src/configs/configuration';
import logger from 'src/shared/logger/logger';
import { AIProvider, EvaluationResult, VocabularyData } from 'src/shared/services/ai/ai.interface';

interface FuseAPIMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface FuseAPIRequest {
  model: string;
  messages: FuseAPIMessage[];
  temperature?: number;
  max_tokens?: number;
}

interface FuseAPIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    completion_tokens: number;
    total_tokens: number;
    prompt_tokens: number;
  };
}

export class FuseProvider implements AIProvider {
  private apiUrl: string;
  private apiKey: string;
  private model = 'claude-opus-4.5';

  constructor() {
    this.apiUrl = configService.ai.fuseApiUrl;
    this.apiKey = configService.ai.apiKey;
    if (!this.apiKey) {
      throw new Error('Fuse API key is required. Set AI_API_KEY in your environment variables.');
    }
  }

  private async callFuseAPI(messages: FuseAPIMessage[], temperature = 0.7): Promise<string> {
    try {
      const requestBody: FuseAPIRequest = {
        model: this.model,
        messages,
        temperature,
      };

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Fuse API error (${response.status}): ${errorText}`);
      }

      const data: FuseAPIResponse = await response.json();

      if (!data.choices || data.choices.length === 0) {
        throw new Error('No response from Fuse API');
      }

      return data.choices[0].message.content;
    } catch (error) {
      logger.error(`Fuse API call failed: ${error}`);
      throw error;
    }
  }

  private parseError(error: unknown): string {
    const errorStr = error instanceof Error ? error.message : String(error);

    // Parse common API errors - return generic messages without sensitive details
    if (errorStr.includes('401') || errorStr.includes('Unauthorized')) {
      return 'Invalid configuration';
    }
    if (errorStr.includes('429') || errorStr.includes('rate limit')) {
      return 'Rate limit exceeded';
    }
    if (errorStr.includes('quota') || errorStr.includes('insufficient')) {
      return 'Out of quota';
    }
    if (errorStr.includes('403') || errorStr.includes('Forbidden')) {
      return 'Permission denied';
    }
    if (errorStr.includes('503') || errorStr.includes('unavailable')) {
      return 'Service unavailable';
    }
    if (errorStr.includes('timeout') || errorStr.includes('ETIMEDOUT')) {
      return 'Request timeout';
    }

    // For unknown errors, return generic message
    return 'Unknown error';
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

      const messages: FuseAPIMessage[] = [{ role: 'user', content: prompt }];

      const responseText = await this.callFuseAPI(messages);

      // Extract JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        logger.error('Failed to parse AI response for topic suggestions');
        throw new Error('AI service error: Failed to parse response');
      }

      const topics = JSON.parse(jsonMatch[0]);
      return topics.slice(0, count);
    } catch (error) {
      const errorMessage = this.parseError(error);
      logger.error(`Error generating topic suggestions: ${error}`);
      throw new Error(errorMessage);
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

      const messages: FuseAPIMessage[] = [{ role: 'user', content: prompt }];

      const responseText = await this.callFuseAPI(messages);

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error('Failed to parse AI response for vocabulary');
        throw new Error('AI service error: Failed to parse response');
      }

      const vocabulary = JSON.parse(jsonMatch[0]);
      return vocabulary;
    } catch (error) {
      const errorMessage = this.parseError(error);
      logger.error(`Error generating vocabulary: ${error}`);
      throw new Error(errorMessage);
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

      const messages: FuseAPIMessage[] = [{ role: 'user', content: prompt }];

      // Use temperature 0 for consistent evaluation
      const responseText = await this.callFuseAPI(messages, 0);

      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error('Failed to parse AI response for evaluation');
        throw new Error('AI service error: Failed to parse response');
      }

      const evaluation = JSON.parse(jsonMatch[0]);

      // Validate scores
      evaluation.score = Math.min(10, Math.max(0, evaluation.score));
      evaluation.breakdown.grammar = Math.min(4, Math.max(0, evaluation.breakdown.grammar));
      evaluation.breakdown.usage = Math.min(3, Math.max(0, evaluation.breakdown.usage));
      evaluation.breakdown.complexity = Math.min(3, Math.max(0, evaluation.breakdown.complexity));

      return evaluation;
    } catch (error) {
      const errorMessage = this.parseError(error);
      logger.error(`Error evaluating sentence: ${error}`);
      throw new Error(errorMessage);
    }
  }
}
