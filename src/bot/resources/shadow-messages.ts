import { ShadowEvaluationResult } from 'src/shared/services/ai/ai.interface';

export const SHADOW_MESSAGES = {
  GENERATING: '🔁 *Shadow Practice*\n\n⏳ Generating a sentence for you...',

  SENTENCE_TEMPLATE: (sentence: string, pronunciation: string, tip: string) =>
    `🔁 *Shadow Practice*\n\n` +
    `🎧 *Listen to the audio above, then repeat it immediately!*\n\n` +
    `📝 *Sentence:*\n\`${sentence}\`\n` +
    `🔤 ${pronunciation}\n\n` +
    `💡 *Focus:* ${tip}\n\n` +
    `🎤 _Reply to this message with a voice message mimicking the rhythm and intonation!_`,

  EVALUATING: '🔄 Analyzing your shadowing...',

  EVALUATION_TEMPLATE: (result: ShadowEvaluationResult) => {
    const getScoreEmoji = (score: number) => {
      if (score >= 8) return '🟢';
      if (score >= 5) return '🟡';
      return '🔴';
    };

    const overallEmoji = result.score >= 8 ? '🌟' : result.score >= 5 ? '👍' : '💪';

    return (
      `🔁 *Shadow Evaluation* ${overallEmoji}\n\n` +
      `📊 *Overall Score:* ${result.score}/10\n\n` +
      `🗣️ *What I heard:*\n_"${result.transcription}"_\n\n` +
      `📋 *Breakdown:*\n` +
      `${getScoreEmoji(result.breakdown.accuracy.score)} *Accuracy:* ${result.breakdown.accuracy.score}/10\n` +
      `  └ ${result.breakdown.accuracy.comment}\n` +
      `${getScoreEmoji(result.breakdown.rhythm.score)} *Rhythm:* ${result.breakdown.rhythm.score}/10\n` +
      `  └ ${result.breakdown.rhythm.comment}\n` +
      `${getScoreEmoji(result.breakdown.connectedSpeech.score)} *Connected Speech:* ${
        result.breakdown.connectedSpeech.score
      }/10\n` +
      `  └ ${result.breakdown.connectedSpeech.comment}\n` +
      `${getScoreEmoji(result.breakdown.stressIntonation.score)} *Stress & Intonation:* ${
        result.breakdown.stressIntonation.score
      }/10\n` +
      `  └ ${result.breakdown.stressIntonation.comment}\n\n` +
      `💬 *Feedback:* ${result.feedback}\n\n` +
      `_Use /shadow to practice another sentence!_`
    );
  },

  ERROR_GENERATING: '❌ Sorry, I could not generate a shadow practice sentence. Please try again later.',
  ERROR_EVALUATING: '❌ Sorry, I could not evaluate your shadowing. Please try again.',
  ERROR_PROVIDER_NOT_SUPPORTED:
    '❌ Shadow practice is only available with the Gemini AI provider. Please contact the admin.',
};
