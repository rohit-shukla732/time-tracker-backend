import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");
const MAX_LOG_SIZE = 10 * 1024 * 1024; // 10MB per file
const MAX_LOG_FILES = 20; // Keep last 20 log files

type LogLevel = "INFO" | "WARN" | "ERROR" | "DEBUG";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: unknown;
  error?: {
    message: string;
    stack?: string;
    code?: string;
  };
}

function ensureLogDirectory() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function getLogFileName(): string {
  const date = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `app-${date}.log`;
}

function rotateLogsIfNeeded(logFile: string) {
  try {
    if (fs.existsSync(logFile)) {
      const stats = fs.statSync(logFile);
      if (stats.size >= MAX_LOG_SIZE) {
        const timestamp = Date.now();
        const rotatedFile = logFile.replace(".log", `-${timestamp}.log`);
        fs.renameSync(logFile, rotatedFile);
        cleanOldLogs();
      }
    }
  } catch (err) {
    console.error("Error rotating logs:", err);
  }
}

function cleanOldLogs() {
  try {
    const files = fs.readdirSync(LOG_DIR)
      .filter(f => f.endsWith(".log"))
      .map(f => ({
        name: f,
        path: path.join(LOG_DIR, f),
        time: fs.statSync(path.join(LOG_DIR, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    // Remove old files beyond MAX_LOG_FILES
    files.slice(MAX_LOG_FILES).forEach(file => {
      fs.unlinkSync(file.path);
    });
  } catch (err) {
    console.error("Error cleaning old logs:", err);
  }
}

function formatLogEntry(entry: LogEntry): string {
  const { timestamp, level, message, data, error } = entry;
  let logLine = `[${timestamp}] [${level}] ${message}`;
  
  if (data !== undefined) {
    try {
      logLine += ` | Data: ${JSON.stringify(data, bigIntReplacer)}`;
    } catch {
      logLine += ` | Data: [Unable to stringify]`;
    }
  }
  
  if (error) {
    logLine += ` | Error: ${error.message}`;
    if (error.code) logLine += ` (Code: ${error.code})`;
    if (error.stack) logLine += `\n  Stack: ${error.stack}`;
  }
  
  return logLine;
}

// Handle BigInt serialization
function bigIntReplacer(_key: string, value: unknown): unknown {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}

function writeLog(level: LogLevel, message: string, data?: unknown, error?: Error & { code?: string }) {
  ensureLogDirectory();
  
  const logFile = path.join(LOG_DIR, getLogFileName());
  rotateLogsIfNeeded(logFile);
  
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    data,
  };
  
  if (error) {
    entry.error = {
      message: error.message,
      stack: error.stack,
      code: error.code,
    };
  }
  
  const logLine = formatLogEntry(entry) + "\n";
  
  // Write to file
  try {
    fs.appendFileSync(logFile, logLine);
  } catch (err) {
    console.error("Failed to write log:", err);
  }
  
  // Also output to console with colors
  const consoleMethod = level === "ERROR" ? console.error : level === "WARN" ? console.warn : console.log;
  consoleMethod(logLine.trim());
}

export const logger = {
  info: (message: string, data?: unknown) => writeLog("INFO", message, data),
  warn: (message: string, data?: unknown) => writeLog("WARN", message, data),
  error: (message: string, error?: Error & { code?: string }, data?: unknown) => writeLog("ERROR", message, data, error),
  debug: (message: string, data?: unknown) => writeLog("DEBUG", message, data),
  
  // Request logger helper
  request: (method: string, path: string, data?: unknown) => {
    writeLog("INFO", `${method} ${path}`, data);
  },
  
  // Response logger helper  
  response: (method: string, path: string, status: number, durationMs?: number) => {
    const level: LogLevel = status >= 500 ? "ERROR" : status >= 400 ? "WARN" : "INFO";
    writeLog(level, `${method} ${path} - ${status}${durationMs ? ` (${durationMs}ms)` : ""}`);
  },
};

export default logger;
