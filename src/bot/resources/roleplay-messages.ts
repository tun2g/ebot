export const ROLEPLAY_SCENARIOS = [
  { id: 'restaurant', emoji: '🍽️', label: 'Ordering at a restaurant' },
  { id: 'interview', emoji: '💼', label: 'Job interview' },
  { id: 'doctor', emoji: '🏥', label: 'Visiting a doctor' },
  { id: 'airport', emoji: '✈️', label: 'At the airport check-in' },
  { id: 'hotel', emoji: '🏨', label: 'Checking into a hotel' },
  { id: 'shopping', emoji: '🛍️', label: 'Shopping for clothes' },
  { id: 'custom', emoji: '✏️', label: 'Custom scenario' },
  { id: 'random', emoji: '🎲', label: 'Random scenario' },
];

export const ROLEPLAY_MESSAGES = {
  WELCOME:
    '🎭 *Roleplay Practice*\n\n' +
    "Practice real-life English conversations! I'll play a character and you respond naturally.\n\n" +
    '🎯 *Choose a scenario:*',

  CUSTOM_PROMPT:
    '✏️ *Custom Scenario*\n\n' +
    'Type your scenario description. For example:\n' +
    '_"Negotiating a salary raise with your boss"_\n' +
    '_"Returning a broken item at a store"_\n' +
    '_"Making small talk with a new neighbor"_',

  SCENARIO_SELECTED: (scenario: string) =>
    `🎭 *Roleplay: ${scenario}*\n\n` +
    "Great choice! Let's begin. I'll start the conversation.\n" +
    '_Reply with text 💬 or voice 🎤 to continue the dialogue._\n' +
    '📌 Send /done to end the roleplay.\n',

  RESPONSE_TEMPLATE: (languageFeedback: string, reply: string) =>
    `📝 *Language Feedback:*\n${languageFeedback}\n\n` + `🎭 *Conversation:*\n${reply}`,

  VOICE_RESPONSE_TEMPLATE: (transcription: string, languageFeedback: string, reply: string) =>
    `🗣️ *I heard:*\n_"${transcription}"_\n\n` +
    `📝 *Language Feedback:*\n${languageFeedback}\n\n` +
    `🎭 *Conversation:*\n${reply}`,

  FAREWELL:
    '🎭 *Roleplay ended!*\n\n' +
    'Great practice session! Use /roleplay anytime to start a new scenario.\n' +
    'Keep practicing! 💪',

  ERROR: '❌ Sorry, something went wrong with the roleplay. Please try again or send /done to end.',

  ERROR_NO_SCENARIO: '⚠️ Please select a scenario first by clicking one of the buttons above.',

  ERROR_VOICE_NOT_SUPPORTED:
    '❌ Voice input in roleplay is only available with the Gemini AI provider. Please type your response instead.',
};
