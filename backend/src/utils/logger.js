import winston from 'winston';
import path from 'path';
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

// Define which transports to use
const transports = [
    // Console transport
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize({ all: true }),
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.printf(
                (info) => `${info.timestamp} ${info.level}: ${info.message}`
            )
        ),
    }),
    // Error log file
    new winston.transports.File({
        filename: path.join(__dirname, '../../logs/error.log'),
        level: 'error',
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.errors({ stack: true }),
            winston.format.json()
        ),
    }),
    // Combined log file
    new winston.transports.File({
        filename: path.join(__dirname, '../../logs/combined.log'),
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
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/exceptions.log'),
        }),
    ],
    // Handle promise rejections
    rejectionHandlers: [
        new winston.transports.File({
            filename: path.join(__dirname, '../../logs/rejections.log'),
        }),
    ],
});

// Create a stream object for morgan
export const morganStream = {
    write: (message) => {
        logger.http(message.trim());
    },
};

export default logger;

