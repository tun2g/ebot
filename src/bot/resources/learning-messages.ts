/**
 * Centralized messages for the English learning bot
 * All user-facing messages are defined here for easy maintenance and future translation support
 */

// ============================================================================
// FIXED MESSAGES
// ============================================================================

export const MESSAGES = {
  // Topic Selection Messages
  TOPIC_SELECTION: {
    HEADER: '🎯 **Weekly Topic Selection!**',
    INTRO: 'Here are 5 topics for this week:',
    FOOTER: '**Be the first to reply with the number (1-5) to select the topic!**',
    GUIDANCE: 'The selected topic will guide our vocabulary learning for the entire week.',
    INVALID_NUMBER: 'Invalid topic number. Please select 1-5.',
    WAIT_FOR_MONDAY: 'Wait for Monday 9 AM for new topic suggestions!',
    REPLY_INSTRUCTION: 'Reply to the topic selection message with a number (1-5) to select!',
  },

  // Vocabulary Messages
  VOCABULARY: {
    HEADER: '📚 **Daily Vocabulary**',
    WORD_LABEL: '**Word:**',
    PRONUNCIATION_LABEL: '**Pronunciation:**',
    VIETNAMESE_LABEL: '**Vietnamese:**',
    SYNONYMS_LABEL: '**Synonyms:**',
    EXAMPLES_HEADER: '**Examples:**',
    YOUR_TURN: '**Your turn!**',
    EVALUATION_TIME: '⏰ Evaluation at 9 PM tonight!',
  },

  // Evaluation Messages
  EVALUATION: {
    HEADER: '🏆 **Daily Evaluation Results**',
    WORD_PREFIX: '📚 Word:',
    TOP_PERFORMERS: '**Top Performers:**',
    ALL_EVALUATED: '📊 All responses have been evaluated and scored!',
    KEEP_GOING: '💪 Keep up the great work!',
    MEDALS: {
      FIRST: '🥇',
      SECOND: '🥈',
      THIRD: '🥉',
      OTHER: '🏅',
    },
  },

  // Weekly Summary Messages
  WEEKLY_SUMMARY: {
    HEADER: '📊 **Weekly Learning Summary**',
    TOPIC_LABEL: '📚 Topic:',
    WEEK_LABEL: '📅 Week:',
    STATISTICS_HEADER: '**📈 Statistics:**',
    TOTAL_DAYS: '• Total days:',
    TOTAL_RESPONSES: '• Total responses:',
    UNIQUE_PARTICIPANTS: '• Unique participants:',
    AVERAGE_SCORE: '• Average score:',
    TOP_PERFORMERS: '**🏆 Top Performers:**',
    VOCABULARY_COVERED: '**📝 Vocabulary Covered:**',
    CLOSING: '🎉 **Great work everyone! See you next week for a new topic!**',
  },

  // Stats Command Messages
  STATS: {
    HEADER: '📊 **Your Learning Stats**',
    NO_ACTIVE_TOPIC: 'No active topic for this week.\nStats will be available once you start learning!',
    NOT_PARTICIPATED:
      "You haven't participated yet this week.\nReply to daily vocabulary messages to start earning points!",
    YOUR_PERFORMANCE: '**Your Performance:**',
    RESPONSES_SUBMITTED: '• Responses submitted:',
    TOTAL_SCORE: '• Total score:',
    AVERAGE_SCORE: '• Average score:',
    PENALTIES: '• Penalties:',
    LEADERBOARD_POSITION: '🏆 Leaderboard position:',
    TOPIC_LABEL: 'Topic:',
    ERROR: 'Error loading stats',
    UNABLE_TO_LOAD: 'Unable to load stats',
  },

  // Topic Command Messages
  TOPIC: {
    HEADER: '📚 **Current Week Topic**',
    NO_ACTIVE_TOPIC: 'No active topic for this week.\nWait for Monday 9 AM for new topic suggestions!',
    PENDING_HEADER: '🎯 **Topic Selection Pending**',
    AVAILABLE_TOPICS: 'Available topics:',
    TOPIC_LABEL: 'Topic:',
    STATUS_LABEL: 'Status:',
    STATUS_ACTIVE: '✅ Active',
    STATUS_PENDING: '⏸ Pending',
    PERIOD_LABEL: 'Period:',
    VOCABULARY_COVERED: '**Vocabulary Covered:**',
    ERROR: 'Error loading topic information',
    NOT_REGISTERED: 'Group not registered yet. Wait for Monday 9 AM for topic suggestions!',
    GROUP_ONLY: 'This command is only available in groups',
  },

  // Learning Menu Messages
  LEARNING_MENU: {
    HEADER: '📚 **English Learning Menu**',
    SELECT_OPTION: 'Select an option:',
    BUTTONS: {
      CURRENT_TOPIC: '📚 Current Topic',
      MY_STATS: '📊 My Stats',
      EDIT_TOPIC: '✏️ Edit Topic',
      BACK_TO_MAIN: '⬅️ Back to Main',
      BACK: '⬅️ Back',
    },
    EDIT_HEADER: '✏️ **Edit Topic Selection**',
    NO_PENDING_TOPIC: 'No pending topic available to edit.',
    SELECT_NEW_TOPIC: 'Select a new topic:\n',
    EDIT_ONLY_MONDAY: 'Topic editing is only available on Monday!',
    GROUP_ONLY: 'This feature is only available in groups',
    ERROR: 'Error loading topic editor',
  },

  // Response Handler Messages
  RESPONSE: {
    CONFIRMATION_HEADER: '✅ Response received!',
    YOUR_SENTENCE: 'Your sentence:',
    EVALUATION_NOTICE: '⏰ Evaluation will be posted at 9 PM tonight!',
    MUST_CONTAIN_WORD: '⚠️ Your sentence must contain the word',
    TRY_AGAIN: 'Please try again!',
    ALREADY_SUBMITTED: 'You have already submitted a response for this vocabulary!',
    ERROR_SAVING: 'Error saving your response. Please try again.',
  },

  // Reminder Messages
  REMINDER: {
    MISSED_PRACTICE: '⚠️ **Reminder**:',
    DONT_FORGET: "participant(s) missed today's vocabulary practice. Don't forget tomorrow!",
  },

  // Error Messages
  ERRORS: {
    GROUP_NOT_REGISTERED: 'Group not registered yet',
    NO_ACTIVE_TOPIC: 'No active topic for this week',
    UNABLE_TO_LOAD: 'Unable to load',
    ERROR_PREFIX: 'Error',
  },
};

// ============================================================================
// PARAMETERIZED MESSAGE FORMATTERS
// ============================================================================

/**
 * Format the topic broadcast message with AI suggestions
 */
export const formatTopicBroadcastMessage = (topics: string[]): string => {
  const suggestionsText = topics.map((topic, index) => `${index + 1}. ${topic}`).join('\n');

  return `${MESSAGES.TOPIC_SELECTION.HEADER}

${MESSAGES.TOPIC_SELECTION.INTRO}

${suggestionsText}

${MESSAGES.TOPIC_SELECTION.FOOTER}

${MESSAGES.TOPIC_SELECTION.GUIDANCE}`;
};

/**
 * Format the daily vocabulary message
 */
export const formatVocabularyMessage = (data: {
  word: string;
  vietnameseMeaning: string;
  englishSynonyms: string[];
  pronunciation: string;
  exampleUsages: string[];
}): string => {
  const synonymsText = data.englishSynonyms.join(', ');
  const examplesText = data.exampleUsages.map((ex, i) => `${i + 1}. ${ex}`).join('\n');

  return `${MESSAGES.VOCABULARY.HEADER}

${MESSAGES.VOCABULARY.WORD_LABEL} ${data.word}
${MESSAGES.VOCABULARY.PRONUNCIATION_LABEL} ${data.pronunciation}
${MESSAGES.VOCABULARY.VIETNAMESE_LABEL} ${data.vietnameseMeaning}
${MESSAGES.VOCABULARY.SYNONYMS_LABEL} ${synonymsText}

${MESSAGES.VOCABULARY.EXAMPLES_HEADER}
${examplesText}

${MESSAGES.VOCABULARY.YOUR_TURN} Reply to this message with a sentence using the word "${data.word}".

${MESSAGES.VOCABULARY.EVALUATION_TIME}`;
};

/**
 * Format the topic selection confirmation message
 */
export const formatTopicSelectedMessage = (
  topicName: string,
  selectedBy: string,
  startTime: string
): string => `🎉 Topic selected: **${topicName}**

Selected by ${selectedBy}

Daily vocabulary will start ${startTime}!`;

/**
 * Format the daily evaluation leaderboard message
 */
export const formatDailyEvaluationMessage = (data: {
  word?: string;
  topResponses: Array<{ userId: number; username: string; score: number }>;
}): string => {
  const wordSection = data.word ? `${MESSAGES.EVALUATION.WORD_PREFIX} **${data.word}**\n\n` : '';

  const performersText = data.topResponses
    .map((r, index) => {
      const medal =
        index === 0
          ? MESSAGES.EVALUATION.MEDALS.FIRST
          : index === 1
          ? MESSAGES.EVALUATION.MEDALS.SECOND
          : index === 2
          ? MESSAGES.EVALUATION.MEDALS.THIRD
          : MESSAGES.EVALUATION.MEDALS.OTHER;
      return `${medal} ${r.username}: ${r.score}/10 points`;
    })
    .join('\n');

  return `${MESSAGES.EVALUATION.HEADER}

${wordSection}${MESSAGES.EVALUATION.TOP_PERFORMERS}
${performersText}

${MESSAGES.EVALUATION.ALL_EVALUATED}
${MESSAGES.EVALUATION.KEEP_GOING}`;
};

/**
 * Format the reminder message for non-responders
 */
export const formatReminderMessage = (missedCount: number): string =>
  `${MESSAGES.REMINDER.MISSED_PRACTICE} ${missedCount} ${MESSAGES.REMINDER.DONT_FORGET}`;

/**
 * Format the weekly summary message
 */
export const formatWeeklySummaryMessage = (data: {
  topicName: string;
  startDate: Date;
  endDate: Date;
  totalDays: number;
  totalResponses: number;
  uniqueParticipants: number;
  avgScore: number;
  topPerformers: Array<{
    userId: number;
    username: string;
    totalScore: number;
    responsesSubmitted: number;
  }>;
  vocabularies: Array<{ word: string; vietnameseMeaning: string }>;
}): string => {
  const performersText = data.topPerformers
    .slice(0, 5)
    .map((stats, index) => {
      const medal =
        index === 0
          ? MESSAGES.EVALUATION.MEDALS.FIRST
          : index === 1
          ? MESSAGES.EVALUATION.MEDALS.SECOND
          : index === 2
          ? MESSAGES.EVALUATION.MEDALS.THIRD
          : MESSAGES.EVALUATION.MEDALS.OTHER;
      const avgUserScore = stats.responsesSubmitted > 0 ? stats.totalScore / stats.responsesSubmitted : 0;
      return `${medal} ${stats.username}: ${stats.totalScore.toFixed(1)} points (${
        stats.responsesSubmitted
      } responses, avg: ${avgUserScore.toFixed(1)})`;
    })
    .join('\n');

  const vocabulariesText = data.vocabularies
    .map((vocab, index) => `${index + 1}. ${vocab.word} - ${vocab.vietnameseMeaning}`)
    .join('\n');

  return `${MESSAGES.WEEKLY_SUMMARY.HEADER}

${MESSAGES.WEEKLY_SUMMARY.TOPIC_LABEL} **${data.topicName}**
${MESSAGES.WEEKLY_SUMMARY.WEEK_LABEL} ${data.startDate.toLocaleDateString()} - ${data.endDate.toLocaleDateString()}

${MESSAGES.WEEKLY_SUMMARY.STATISTICS_HEADER}
${MESSAGES.WEEKLY_SUMMARY.TOTAL_DAYS} ${data.totalDays}
${MESSAGES.WEEKLY_SUMMARY.TOTAL_RESPONSES} ${data.totalResponses}
${MESSAGES.WEEKLY_SUMMARY.UNIQUE_PARTICIPANTS} ${data.uniqueParticipants}
${MESSAGES.WEEKLY_SUMMARY.AVERAGE_SCORE} ${data.avgScore.toFixed(1)}/10

${MESSAGES.WEEKLY_SUMMARY.TOP_PERFORMERS}
${performersText}

${MESSAGES.WEEKLY_SUMMARY.VOCABULARY_COVERED}
${vocabulariesText}

${MESSAGES.WEEKLY_SUMMARY.CLOSING}`;
};

/**
 * Format user stats message
 */
export const formatUserStatsMessage = (data: {
  topicName: string;
  responsesSubmitted: number;
  totalScore: number;
  avgScore: number;
  penaltyCount: number;
  leaderboardPosition?: number;
  totalParticipants?: number;
}): string => {
  let message = `${MESSAGES.STATS.HEADER}\n\n`;
  message += `${MESSAGES.STATS.TOPIC_LABEL} **${data.topicName}**\n\n`;
  message += `${MESSAGES.STATS.YOUR_PERFORMANCE}\n`;
  message += `${MESSAGES.STATS.RESPONSES_SUBMITTED} ${data.responsesSubmitted}\n`;
  message += `${MESSAGES.STATS.TOTAL_SCORE} ${data.totalScore.toFixed(1)} points\n`;
  message += `${MESSAGES.STATS.AVERAGE_SCORE} ${data.avgScore.toFixed(1)}/10\n`;
  message += `${MESSAGES.STATS.PENALTIES} ${data.penaltyCount}\n`;

  if (data.leaderboardPosition && data.leaderboardPosition > 0) {
    if (data.totalParticipants) {
      message += `\n${MESSAGES.STATS.LEADERBOARD_POSITION} #${data.leaderboardPosition} out of ${data.totalParticipants}\n`;
    } else {
      message += `\n${MESSAGES.STATS.LEADERBOARD_POSITION} #${data.leaderboardPosition}\n`;
    }
  }

  return message;
};

/**
 * Format current topic display message
 */
export const formatCurrentTopicMessage = (data: {
  topicName: string;
  status: 'active' | 'pending';
  startDate: Date;
  endDate: Date;
  vocabularies?: Array<{ word: string; vietnameseMeaning: string }>;
}): string => {
  let message = `${MESSAGES.TOPIC.HEADER}\n\n`;
  message += `${MESSAGES.TOPIC.TOPIC_LABEL} **${data.topicName}**\n`;
  message += `${MESSAGES.TOPIC.STATUS_LABEL} ${
    data.status === 'active' ? MESSAGES.TOPIC.STATUS_ACTIVE : MESSAGES.TOPIC.STATUS_PENDING
  }\n`;
  message += `${
    MESSAGES.TOPIC.PERIOD_LABEL
  } ${data.startDate.toLocaleDateString()} - ${data.endDate.toLocaleDateString()}\n`;

  if (data.vocabularies && data.vocabularies.length > 0) {
    message += `\n${MESSAGES.TOPIC.VOCABULARY_COVERED}\n`;
    data.vocabularies.forEach((vocab) => {
      message += `• ${vocab.word} - ${vocab.vietnameseMeaning}\n`;
    });
  }

  return message;
};

/**
 * Format pending topic selection message
 */
export const formatPendingTopicMessage = (topics: string[]): string => {
  let message = `${MESSAGES.TOPIC.HEADER}\n\n`;
  message += `${MESSAGES.TOPIC.PENDING_HEADER}\n\n`;
  message += `${MESSAGES.TOPIC.AVAILABLE_TOPICS}\n`;
  topics.forEach((topic, index) => {
    message += `${index + 1}. ${topic}\n`;
  });
  message += `\n${MESSAGES.TOPIC_SELECTION.REPLY_INSTRUCTION}`;
  return message;
};

/**
 * Format response confirmation message
 */
export const formatResponseConfirmationMessage = (sentence: string): string => `${MESSAGES.RESPONSE.CONFIRMATION_HEADER}

${MESSAGES.RESPONSE.YOUR_SENTENCE} "${sentence}"

${MESSAGES.RESPONSE.EVALUATION_NOTICE}`;

/**
 * Format word missing warning message
 */
export const formatWordMissingMessage = (word: string): string =>
  `${MESSAGES.RESPONSE.MUST_CONTAIN_WORD} "**${word}**". ${MESSAGES.RESPONSE.TRY_AGAIN}`;
