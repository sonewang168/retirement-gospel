/**
 * ============================================
 * 日誌服務
 * ============================================
 */

const winston = require('winston');
const path = require('path');

// 自訂格式
const customFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.errors({ stack: true }),
    winston.format.printf(({ level, message, timestamp, stack }) => {
        if (stack) {
            return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
        }
        return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
);

// 控制台格式（帶顏色）
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.printf(({ level, message, timestamp }) => {
        return `${timestamp} ${level}: ${message}`;
    })
);

// 建立 logger
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: customFormat,
    defaultMeta: { service: 'retirement-gospel' },
    transports: [
        // 控制台輸出
        new winston.transports.Console({
            format: consoleFormat
        })
    ]
});

// 在非生產環境下，也輸出到檔案
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.File({
        filename: path.join(__dirname, '../../logs/error.log'),
        level: 'error',
        maxsize: 5242880, // 5MB
        maxFiles: 5
    }));
    
    logger.add(new winston.transports.File({
        filename: path.join(__dirname, '../../logs/combined.log'),
        maxsize: 5242880,
        maxFiles: 5
    }));
}

// 擴充方法
logger.logRequest = (req, message) => {
    const userId = req.body?.events?.[0]?.source?.userId || 'unknown';
    logger.info(`[${userId}] ${message}`);
};

logger.logLineEvent = (event) => {
    const userId = event.source?.userId || 'unknown';
    const type = event.type;
    logger.info(`[LINE Event] User: ${userId}, Type: ${type}`);
};

module.exports = logger;
