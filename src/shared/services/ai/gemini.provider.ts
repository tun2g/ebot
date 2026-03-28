import { GoogleGenerativeAI } from '@google/generative-ai';
import { configService } from 'src/configs/configuration';
import logger from 'src/shared/logger/logger';
import {
  AIProvider,
  ChatMessage,
  EvaluationResult,
  VocabularyData,
  VoicePracticeResult,
  VoicePronunciationResult,
} from 'src/shared/services/ai/ai.interface';

export class GeminiProvider implements AIProvider {
  private genAI: GoogleGenerativeAI;
  private model: ReturnType<GoogleGenerativeAI['getGenerativeModel']>;

  constructor() {
    this.genAI = new GoogleGenerativeAI(configService.ai.apiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }

  private parseError(error: unknown): string {
    const errorStr = error instanceof Error ? error.message : String(error);

    // Parse common Google AI errors - return generic messages without sensitive details
    if (errorStr.includes('API_KEY_INVALID') || errorStr.includes('API key not valid')) {
      return 'Invalid configuration';
    }
    if (errorStr.includes('RESOURCE_EXHAUSTED') || errorStr.includes('quota')) {
      return 'Out of quota';
    }
    if (errorStr.includes('PERMISSION_DENIED')) {
      return 'Permission denied';
    }
    if (errorStr.includes('RATE_LIMIT') || errorStr.includes('429')) {
      return 'Rate limit exceeded';
    }
    if (errorStr.includes('UNAVAILABLE') || errorStr.includes('503')) {
      return 'Service unavailable';
    }
    if (errorStr.includes('DEADLINE_EXCEEDED') || errorStr.includes('timeout')) {
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

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/);
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

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
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

For each category, provide:
- The score
- A concise comment in English (1-2 sentences) explaining WHY that score was given, pointing out specific mistakes if any, and giving suggestions for improvement

Also provide:
- Total score (0-10, sum of breakdown scores)
- Overall feedback in English (1-2 sentences summarizing the evaluation)

Return ONLY a JSON object with this exact structure:
{
  "score": 8,
  "feedback": "Your sentence is very good! The grammar is accurate and the word is used naturally.",
  "breakdown": {
    "grammar": { "score": 4, "comment": "Grammar is completely correct, with a clear and natural sentence structure." },
    "usage": { "score": 3, "comment": "The word is used in the right context and very naturally." },
    "complexity": { "score": 1, "comment": "The sentence is quite simple; try using subordinate clauses or richer vocabulary." }
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
        throw new Error('AI service error: Failed to parse response');
      }

      const evaluation = JSON.parse(jsonMatch[0]);

      // Validate scores
      evaluation.breakdown.grammar.score = Math.min(4, Math.max(0, evaluation.breakdown.grammar.score));
      evaluation.breakdown.usage.score = Math.min(3, Math.max(0, evaluation.breakdown.usage.score));
      evaluation.breakdown.complexity.score = Math.min(3, Math.max(0, evaluation.breakdown.complexity.score));

      // Recalculate total score as sum of breakdown scores
      evaluation.score =
        evaluation.breakdown.grammar.score + evaluation.breakdown.usage.score + evaluation.breakdown.complexity.score;

      return evaluation;
    } catch (error) {
      const errorMessage = this.parseError(error);
      logger.error(`Error evaluating sentence: ${error}`);
      throw new Error(errorMessage);
    }
  }

  async generateVoiceSentence(topic?: string): Promise<VoicePracticeResult> {
    try {
      const topicInstruction = topic
        ? `The sentence should be related to the topic "${topic}".`
        : 'Choose a random everyday topic (e.g., travel, food, technology, work, hobbies).';

      const prompt = `You are an English pronunciation coach. Generate a single English sentence for a student to practice speaking aloud.

Requirements:
- The sentence should be 10-20 words long
- Use natural, conversational English
- Include a mix of common and slightly challenging pronunciation patterns (e.g., th, r/l, vowel sounds, consonant clusters)
- ${topicInstruction}
- Provide the IPA (International Phonetic Alphabet) pronunciation of the full sentence
- Provide a brief pronunciation tip for the sentence

Return ONLY a JSON object with this exact structure:
{
  "sentence": "The weather forecast predicts thunderstorms throughout the entire weekend.",
  "pronunciation": "/ðə ˈwɛðər ˈfɔːrkæst prɪˈdɪkts ˈθʌndərˌstɔːrmz θruːˈaʊt ði ɪnˈtaɪər ˈwiːkˌɛnd/",
  "tip": "Pay attention to the 'th' sounds in 'the', 'weather', 'thunderstorms', and 'throughout'. Place your tongue between your teeth."
}

JSON:`;

      const result = await this.model.generateContent(prompt);
      const response = result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error('Failed to parse AI response for voice sentence');
        throw new Error('AI service error: Failed to parse response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      const errorMessage = this.parseError(error);
      logger.error(`Error generating voice sentence: ${error}`);
      throw new Error(errorMessage);
    }
  }

  async evaluateVoicePronunciation(
    audioBuffer: Buffer,
    mimeType: string,
    expectedSentence: string
  ): Promise<VoicePronunciationResult> {
    try {
      const audioBase64 = audioBuffer.toString('base64');

      const prompt = `You are an English pronunciation evaluator. Listen to this audio recording and evaluate the student's pronunciation.

The student was asked to read this sentence aloud:
"${expectedSentence}"

Instructions:
1. First, transcribe exactly what you hear in the audio
2. Compare the transcription with the expected sentence
3. Evaluate pronunciation quality

Evaluate based on:
1. Accuracy (0-4 points): How closely the spoken words match the expected sentence (correct words, no omissions/additions)
2. Fluency (0-3 points): Natural rhythm, appropriate pace, smooth delivery without excessive pauses or hesitation
3. Intonation (0-3 points): Proper stress patterns, rising/falling tones, natural English prosody

For each category, provide:
- The score
- A concise comment in English (1-2 sentences) with specific feedback

Also provide:
- Total score (0-10, sum of breakdown scores)
- Overall feedback in English (2-3 sentences summarizing the evaluation and giving actionable improvement tips)

Return ONLY a JSON object with this exact structure:
{
  "transcription": "what you actually heard",
  "score": 7,
  "feedback": "Good pronunciation overall! You spoke clearly and most words were accurate. Try to work on the 'th' sound and maintain a more natural rhythm.",
  "breakdown": {
    "accuracy": { "score": 3, "comment": "Most words were pronounced correctly, but 'throughout' sounded like 'troughout'." },
    "fluency": { "score": 2, "comment": "Generally smooth but there was a noticeable pause before 'thunderstorms'." },
    "intonation": { "score": 2, "comment": "Good falling intonation at the end, but the sentence sounded a bit flat in the middle." }
  }
}

JSON:`;

      const result = await this.model.generateContent({
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: audioBase64,
                },
              },
              { text: prompt },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
        },
      });

      const response = result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error('Failed to parse AI response for voice evaluation');
        throw new Error('AI service error: Failed to parse response');
      }

      const evaluation = JSON.parse(jsonMatch[0]);

      // Validate scores
      evaluation.breakdown.accuracy.score = Math.min(4, Math.max(0, evaluation.breakdown.accuracy.score));
      evaluation.breakdown.fluency.score = Math.min(3, Math.max(0, evaluation.breakdown.fluency.score));
      evaluation.breakdown.intonation.score = Math.min(3, Math.max(0, evaluation.breakdown.intonation.score));

      // Recalculate total score
      evaluation.score =
        evaluation.breakdown.accuracy.score +
        evaluation.breakdown.fluency.score +
        evaluation.breakdown.intonation.score;

      return evaluation;
    } catch (error) {
      const errorMessage = this.parseError(error);
      logger.error(`Error evaluating voice pronunciation: ${error}`);
      throw new Error(errorMessage);
    }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    try {
      const systemPrompt = `You are a friendly and helpful English language assistant. Your role is to:
- Help users practice and improve their English
- Answer questions about English grammar, vocabulary, pronunciation, and usage
- Correct mistakes gently and explain why
- Provide examples and alternative ways to express ideas
- Adapt your language level to the user's proficiency
- Be encouraging and supportive
- Keep responses concise but informative
- If the user writes in Vietnamese, respond in a mix of English and Vietnamese to help them understand

You are having a conversation. Respond naturally and helpfully.`;

      const contents = messages.map((msg) => ({
        role: msg.role === 'user' ? ('user' as const) : ('model' as const),
        parts: [{ text: msg.content }],
      }));

      const result = await this.model.generateContent({
        contents,
        systemInstruction: { role: 'user' as const, parts: [{ text: systemPrompt }] },
      });

      const response = result.response;
      return response.text();
    } catch (error) {
      const errorMessage = this.parseError(error);
      logger.error(`Error in chat: ${error}`);
      throw new Error(errorMessage);
    }
  }

  async generateSpeech(text: string): Promise<Buffer> {
    try {
      const apiKey = configService.ai.apiKey;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

      const body = {
        contents: [
          {
            parts: [
              { text: `Say the following sentence clearly and naturally with proper English pronunciation: "${text}"` },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: 'Kore',
              },
            },
          },
        },
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`TTS API error ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;

      if (!inlineData?.data) {
        throw new Error('No audio data in TTS response');
      }

      const mimeType = inlineData.mimeType || 'audio/L16';
      logger.info(`[TTS] Audio received - mimeType: ${mimeType}, dataLength: ${inlineData.data.length}`);

      const pcmBuffer = Buffer.from(inlineData.data, 'base64');

      // Gemini TTS returns raw PCM (linear16, 24kHz, mono) - wrap in WAV header
      return this.wrapPcmInWav(pcmBuffer, 24000, 1, 16);
    } catch (error) {
      const errorMessage = this.parseError(error);
      logger.error(`Error generating speech: ${error}`);
      throw new Error(errorMessage);
    }
  }

  /**
   * Wraps raw PCM data in a WAV header so it can be played by Telegram
   */
  private wrapPcmInWav(pcmData: Buffer, sampleRate: number, channels: number, bitsPerSample: number): Buffer {
    const byteRate = (sampleRate * channels * bitsPerSample) / 8;
    const blockAlign = (channels * bitsPerSample) / 8;
    const dataSize = pcmData.length;
    const headerSize = 44;

    const header = Buffer.alloc(headerSize);
    header.write('RIFF', 0);
    header.writeUInt32LE(dataSize + headerSize - 8, 4);
    header.write('WAVE', 8);
    header.write('fmt ', 12);
    header.writeUInt32LE(16, 16); // fmt chunk size
    header.writeUInt16LE(1, 20); // PCM format
    header.writeUInt16LE(channels, 22);
    header.writeUInt32LE(sampleRate, 24);
    header.writeUInt32LE(byteRate, 28);
    header.writeUInt16LE(blockAlign, 32);
    header.writeUInt16LE(bitsPerSample, 34);
    header.write('data', 36);
    header.writeUInt32LE(dataSize, 40);

    return Buffer.concat([header, pcmData]);
  }
}
