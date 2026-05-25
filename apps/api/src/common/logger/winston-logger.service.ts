import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { join } from 'path';

@Injectable()
export class WinstonLoggerService implements LoggerService {
  private logger: winston.Logger;

  constructor(private readonly configService: ConfigService) {
    const logLevel = this.configService.get<string>('app.logLevel', 'debug');
    const logDir = this.configService.get<string>('app.logDir', 'logs');
    const nodeEnv = this.configService.get<string>('app.nodeEnv', 'development');

    const transports: winston.transport[] = [];

    // 控制台输出
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
          winston.format.colorize({ all: nodeEnv === 'development' }),
          winston.format.printf(({ timestamp, level, message, context, trace }) => {
            const ctx = context ? `[${context}]` : '';
            const traceStr = trace ? `\n${trace}` : '';
            return `${timestamp} ${level} ${ctx} ${message}${traceStr}`;
          }),
        ),
      }),
    );

    // 文件输出 - 错误日志
    transports.push(
      new DailyRotateFile({
        dirname: join(process.cwd(), logDir),
        filename: 'error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxSize: '20m',
        maxFiles: '30d',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    );

    // 文件输出 - 全部日志
    transports.push(
      new DailyRotateFile({
        dirname: join(process.cwd(), logDir),
        filename: 'combined-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxSize: '20m',
        maxFiles: '14d',
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.json(),
        ),
      }),
    );

    this.logger = winston.createLogger({
      level: logLevel,
      levels: winston.config.npm.levels,
      transports,
      exceptionHandlers: [
        new winston.transports.File({
          filename: join(process.cwd(), logDir, 'exceptions.log'),
        }),
      ],
      rejectionHandlers: [
        new winston.transports.File({
          filename: join(process.cwd(), logDir, 'rejections.log'),
        }),
      ],
    });
  }

  log(message: string, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: string, trace?: string, context?: string) {
    this.logger.error(message, { trace, context });
  }

  warn(message: string, context?: string) {
    this.logger.warn(message, { context });
  }

  debug(message: string, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: string, context?: string) {
    this.logger.verbose(message, { context });
  }

  // 获取原始 winston logger 实例
  getWinstonLogger(): winston.Logger {
    return this.logger;
  }
}
