"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.morganStream = exports.logger = void 0;
const winston_1 = require("winston");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
// Créer le dossier logs s'il n'existe pas
const logDir = path_1.default.join(process.cwd(), "logs");
if (!fs_1.default.existsSync(logDir)) {
    fs_1.default.mkdirSync(logDir, { recursive: true });
}
const { combine, timestamp, printf, colorize, errors } = winston_1.format;
// Format console — coloré et lisible
const consoleFormat = printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${timestamp} [${level}] ${stack || message}${metaStr}`;
});
// Format fichier — JSON structuré
const fileFormat = combine(timestamp({ format: "YYYY-MM-DD HH:mm:ss" }), errors({ stack: true }), winston_1.format.json());
exports.logger = (0, winston_1.createLogger)({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    transports: [
        // Console — développement
        new winston_1.transports.Console({
            format: combine(colorize({ all: true }), timestamp({ format: "HH:mm:ss" }), errors({ stack: true }), consoleFormat),
        }),
        // Fichier erreurs uniquement
        new winston_1.transports.File({
            filename: path_1.default.join(logDir, "error.log"),
            level: "error",
            format: fileFormat,
            maxsize: 5 * 1024 * 1024, // 5MB
            maxFiles: 5,
        }),
        // Fichier toutes les logs
        new winston_1.transports.File({
            filename: path_1.default.join(logDir, "combined.log"),
            format: fileFormat,
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 10,
        }),
    ],
});
// Stream pour Morgan (logs HTTP)
exports.morganStream = {
    write: (message) => {
        exports.logger.http(message.trim());
    },
};
