import winston from 'winston';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { ENV } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};

// Define colors for each level
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};

// Tell winston that we want to link the colors
winston.addColors(colors);

// Ensure logs directory exists
const logDir = path.join(__dirname, '../../logs');
try {
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
} catch (e) {
    // Fallback to console if cannot create directory
    // This should not crash the app
}

// Define which transports to use
const transports = [
    // Console transport
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.errors({ stack: true }),
            winston.format.splat(),
            winston.format.printf(
                (info) => {
                    const { timestamp, level, message, ...meta } = info;
                    const metaStr = Object.keys(meta).length > 0
                        ? ' ' + JSON.stringify(meta, null, 2)
                        : '';
                    return `${timestamp} ${level}: ${message}${metaStr}`;
                }
            )
        ),
    }),
    // Error log file
    new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
        ),
    }),
    // Combined log file
    new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
        ),
    }),
];

// Create the logger
export const logger = winston.createLogger({
    level: ENV.NODE_ENV === 'production' ? 'info' : 'debug',
    levels,
    transports,
    // Handle exceptions
    exceptionHandlers: [
        new winston.transports.File({ filename: path.join(logDir, 'exceptions.log') }),
    ],
    // Handle promise rejections
    rejectionHandlers: [
        new winston.transports.File({ filename: path.join(logDir, 'rejections.log') }),
    ],
});

// Create a stream object for morgan
export const morganStream = {
    write: (message) => {
        logger.http(message.trim());
    },
};

export default logger;

