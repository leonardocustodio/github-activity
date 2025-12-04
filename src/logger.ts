/**
 * Logging utility for GitHub Activity
 */

import { Logger } from "./types";

export class ConsoleLogger implements Logger {
  private logLevel: "debug" | "info" | "warn" | "error";

  private levels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
  };

  constructor(logLevel: "debug" | "info" | "warn" | "error" = "info") {
    this.logLevel = logLevel;
  }

  private shouldLog(level: keyof typeof this.levels): boolean {
    return this.levels[level] >= this.levels[this.logLevel];
  }

  private formatMessage(
    level: string,
    message: string,
    args: unknown[],
  ): string {
    const timestamp = new Date().toISOString();
    const argsStr =
      args.length > 0
        ? " " +
          args
            .map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a)))
            .join(" ")
        : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${argsStr}`;
  }

  debug(message: string, ...args: unknown[]): void {
    if (!this.shouldLog("debug")) return;
    const formatted = this.formatMessage("debug", message, args);
    console.debug(formatted);
  }

  info(message: string, ...args: unknown[]): void {
    if (!this.shouldLog("info")) return;
    const formatted = this.formatMessage("info", message, args);
    console.info(formatted);
  }

  warn(message: string, ...args: unknown[]): void {
    if (!this.shouldLog("warn")) return;
    const formatted = this.formatMessage("warn", message, args);
    console.warn(formatted);
  }

  error(message: string, ...args: unknown[]): void {
    if (!this.shouldLog("error")) return;
    const formatted = this.formatMessage("error", message, args);
    console.error(formatted);
  }
}

export const createLogger = (
  logLevel: "debug" | "info" | "warn" | "error" = "info",
): Logger => {
  return new ConsoleLogger(logLevel);
};
