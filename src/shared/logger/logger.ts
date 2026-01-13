import * as winston from 'winston';

const customFormat = winston.format.printf(
  ({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`,
);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.colorize(),
    winston.format.errors(),
    customFormat,
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
