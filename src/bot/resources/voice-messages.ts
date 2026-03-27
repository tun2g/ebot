export const VOICE_MESSAGES = {
  GENERATING: '🎙️ *Voice Practice*\n\n⏳ Generating a sentence for you to practice...',

  SENTENCE_TEMPLATE: (sentence: string, tip: string) =>
    `🎙️ *Voice Practice*\n\n` +
    `📝 *Read this sentence aloud:*\n` +
    `\`${sentence}\`\n\n` +
    `💡 *Tip:* ${tip}\n\n` +
    `🎤 _Reply to this message with a voice message to get your pronunciation evaluated!_`,

  EVALUATING: '🔄 Analyzing your pronunciation...',

  EVALUATION_TEMPLATE: (result: {
    transcription: string;
    score: number;
    feedback: string;
    breakdown: {
      accuracy: { score: number; comment: string };
      fluency: { score: number; comment: string };
      intonation: { score: number; comment: string };
    };
  }) => {
    const getScoreEmoji = (score: number, max: number) => {
      const pct = score / max;
      if (pct >= 0.8) return '🟢';
      if (pct >= 0.5) return '🟡';
      return '🔴';
    };

    const overallEmoji = result.score >= 8 ? '🌟' : result.score >= 5 ? '👍' : '💪';

    return (
      `🎙️ *Pronunciation Evaluation* ${overallEmoji}\n\n` +
      `📊 *Overall Score:* ${result.score}/10\n\n` +
      `🗣️ *What I heard:*\n_"${result.transcription}"_\n\n` +
      `📋 *Breakdown:*\n` +
      `${getScoreEmoji(result.breakdown.accuracy.score, 4)} *Accuracy:* ${result.breakdown.accuracy.score}/4\n` +
      `  └ ${result.breakdown.accuracy.comment}\n` +
      `${getScoreEmoji(result.breakdown.fluency.score, 3)} *Fluency:* ${result.breakdown.fluency.score}/3\n` +
      `  └ ${result.breakdown.fluency.comment}\n` +
      `${getScoreEmoji(result.breakdown.intonation.score, 3)} *Intonation:* ${result.breakdown.intonation.score}/3\n` +
      `  └ ${result.breakdown.intonation.comment}\n\n` +
      `💬 *Feedback:* ${result.feedback}\n\n` +
      `_Use /voice to practice another sentence!_`
    );
  },

  ERROR_GENERATING: '❌ Sorry, I could not generate a sentence right now. Please try again later.',
  ERROR_EVALUATING: '❌ Sorry, I could not evaluate your pronunciation. Please try again.',
  ERROR_NO_VOICE:
    '⚠️ Please reply with a *voice message* (use the microphone button) to get your pronunciation evaluated.',
  ERROR_NOT_REPLY: '⚠️ Please *reply directly* to the sentence message with your voice recording.',
  ERROR_PROVIDER_NOT_SUPPORTED:
    '❌ Voice practice is only available with the Gemini AI provider. Please contact the admin.',
};
