import { bot } from 'src/bot';
import { setUpBotCommand } from 'src/bot/commands/setup';
import { BOT_DESCRIPTION } from 'src/bot/constants/bot-description';
import { initializeJobs } from 'src/bot/jobs';
import { mongodbConnection } from 'src/database';
import logger from 'src/shared/logger/logger';

process.on('uncaughtException', (err) => {
  console.error(err?.stack);
});

process.on('unhandledRejection', (reason, error) => {
  logger.error(reason);
  logger.error(error);
});

const bootstrap = async () => {
  // Initialize MongoDB connection with retry logic
  try {
    await mongodbConnection.ensureConnection();
    logger.info('✅ MongoDB is ready');
  } catch (err) {
    logger.error(`❌ Failed to connect to MongoDB: ${err}`);
    logger.error('❌ Bot cannot start without MongoDB. Exiting...');
    process.exit(1);
  }

  // Get bot info first
  const botInfo = await bot.telegram.getMe();
  logger.info(`🤖 Bot info: @${botInfo.username} (ID: ${botInfo.id})`);

  // Purpose: setup bot commands. E.g: `/start Start Lady bot`
  await setUpBotCommand.process();

  // Purpose: setup bot'description when user first time visit and click `START` button
  const res = await bot.telegram.setMyDescription(BOT_DESCRIPTION);

  if (res) {
    logger.info("😎 Set bot'description successfully");
  }

  // Initialize cron jobs for English learning feature
  await initializeJobs();

  await bot.launch(() => {
    logger.info(`🚀 Bot @${botInfo.username} is now running!`);
    logger.info('📝 Bot will only respond to:');
    logger.info('  - Direct messages (private chats)');
    logger.info(`  - Messages mentioning @${botInfo.username} in groups/channels`);
  });
};

bootstrap().catch((err) => {
  logger.error(`❌ Bot cannot be started due to error: \n${err}`);
});
