import { GoogleGenerativeAI } from '@google/generative-ai';
import { configService } from 'src/configs/configuration';
import logger from 'src/shared/logger/logger';
import {
  AIProvider,
  ChatMessage,
  EvaluationResult,
  RoleplayResponse,
  ShadowEvaluationResult,
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

  async roleplayChat(scenario: string, messages: ChatMessage[]): Promise<RoleplayResponse> {
    try {
      const systemPrompt = `You are a roleplay partner for English practice. You are playing a character in the following scenario: "${scenario}".

Your rules:
- Stay in character and respond naturally as the character in the scenario
- After receiving the user's message, provide TWO things in your response:
  1. Language feedback: Point out any grammar, vocabulary, or naturalness issues in the user's message. Be specific and helpful. If the message is perfect, say so briefly.
  2. In-character reply: Continue the conversation as your character, asking follow-up questions or responding naturally to keep the dialogue going.

- Keep your in-character replies conversational and at an intermediate English level
- If the user's message is the very first one (empty or just a greeting), generate the opening line of the scenario as your character
- Use natural, everyday English appropriate for the scenario

Return ONLY a JSON object with this exact structure:
{
  "languageFeedback": "Your specific feedback on the user's English...",
  "reply": "Your in-character response continuing the conversation..."
}

JSON:`;

      const contents = messages.map((msg) => ({
        role: msg.role === 'user' ? ('user' as const) : ('model' as const),
        parts: [{ text: msg.content }],
      }));

      const result = await this.model.generateContent({
        contents,
        systemInstruction: { role: 'user' as const, parts: [{ text: systemPrompt }] },
      });

      const response = result.response;
      const text = response.text();

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error('Failed to parse AI response for roleplay');
        throw new Error('AI service error: Failed to parse response');
      }

      return JSON.parse(jsonMatch[0]);
    } catch (error) {
      const errorMessage = this.parseError(error);
      logger.error(`Error in roleplay chat: ${error}`);
      throw new Error(errorMessage);
    }
  }

  async evaluateShadowing(
    audioBuffer: Buffer,
    mimeType: string,
    expectedSentence: string
  ): Promise<ShadowEvaluationResult> {
    try {
      const audioBase64 = audioBuffer.toString('base64');

      const prompt = `You are a friendly English pronunciation coach specializing in shadowing practice. The user listened to a native speaker say a sentence, then immediately tried to repeat it, mimicking the rhythm and intonation.

The expected sentence was:
"${expectedSentence}"

Listen to the recording and evaluate the SHADOWING performance. Focus especially on rhythm and connected speech, not just word accuracy.

IMPORTANT: In all your comments and feedback, address the user directly using "you/your" (e.g., "You matched the rhythm well" NOT "The student matched the rhythm well"). Be encouraging and specific.

Evaluate based on (each scored 0-10):
1. Accuracy (0-10): How closely the spoken words match the expected sentence. 10 = perfect match, 0 = completely different.
2. Rhythm (0-10): Did you match the natural pace and timing? Are stressed/unstressed syllables appropriately timed? Vietnamese speakers tend to give equal time to every syllable — check for this.
3. Connected Speech (0-10): Did you link words naturally? Look for proper linking (e.g., "an_apple"), reductions (e.g., "gonna", "wanna"), and elisions. Vietnamese speakers often separate every word — check for this.
4. Stress & Intonation (0-10): Are content words stressed and function words reduced? Is the intonation pattern natural (rising for questions, falling for statements)?

For each category, provide:
- The score (0-10)
- A concise, specific comment in English (1-2 sentences), addressing the user as "you"

Also provide:
- Overall score (0-10, rounded average of all 4 breakdown scores)
- Overall feedback in English (2-3 sentences with actionable tips), addressing the user as "you"

Return ONLY a JSON object with this exact structure:
{
  "transcription": "what you actually heard",
  "score": 7,
  "feedback": "You did a great job with... Try to...",
  "breakdown": {
    "accuracy": { "score": 8, "comment": "You accurately reproduced..." },
    "rhythm": { "score": 6, "comment": "Your rhythm was..." },
    "connectedSpeech": { "score": 5, "comment": "You could improve linking in..." },
    "stressIntonation": { "score": 7, "comment": "Your stress patterns were..." }
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
      let text: string;
      try {
        text = response.text();
      } catch (parseErr) {
        logger.error(`[Shadow] response.text() threw: ${parseErr}`);
        logger.error(
          `[Shadow] Response candidates: ${JSON.stringify(
            response.candidates?.map((c) => ({ finishReason: c.finishReason, safetyRatings: c.safetyRatings }))
          )}`
        );
        throw new Error('AI service error: Empty or blocked response');
      }

      if (!text || text.trim().length === 0) {
        logger.error(
          `[Shadow] Empty response text. Candidates: ${JSON.stringify(
            response.candidates?.map((c) => ({ finishReason: c.finishReason }))
          )}`
        );
        throw new Error('AI service error: Empty response');
      }

      logger.info(`[Shadow] Raw AI response (${text.length} chars): ${text.substring(0, 500)}`);

      // Try to extract JSON - strip markdown code fences if present
      const cleanedText = text.replace(/```(?:json)?\s*/g, '').replace(/```/g, '');
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        logger.error(`[Shadow] Failed to parse AI response. Full response: ${text}`);
        throw new Error('AI service error: Failed to parse response');
      }

      const evaluation = JSON.parse(jsonMatch[0]);

      // Validate scores (0-10 per section)
      evaluation.breakdown.accuracy.score = Math.min(10, Math.max(0, evaluation.breakdown.accuracy.score));
      evaluation.breakdown.rhythm.score = Math.min(10, Math.max(0, evaluation.breakdown.rhythm.score));
      evaluation.breakdown.connectedSpeech.score = Math.min(
        10,
        Math.max(0, evaluation.breakdown.connectedSpeech.score)
      );
      evaluation.breakdown.stressIntonation.score = Math.min(
        10,
        Math.max(0, evaluation.breakdown.stressIntonation.score)
      );

      // Recalculate overall as rounded average
      evaluation.score = Math.round(
        (evaluation.breakdown.accuracy.score +
          evaluation.breakdown.rhythm.score +
          evaluation.breakdown.connectedSpeech.score +
          evaluation.breakdown.stressIntonation.score) /
          4
      );

      return evaluation;
    } catch (error) {
      const errorMessage = this.parseError(error);
      logger.error(`Error evaluating shadowing: ${error}`);
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
