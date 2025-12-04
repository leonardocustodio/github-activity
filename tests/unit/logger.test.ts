/**
 * Unit tests for Logger
 */

import { ConsoleLogger } from "../../src/logger";

describe("ConsoleLogger", () => {
  let consoleDebugSpy: jest.SpyInstance;
  let consoleInfoSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleDebugSpy = jest.spyOn(console, "debug").mockImplementation();
    consoleInfoSpy = jest.spyOn(console, "info").mockImplementation();
    consoleWarnSpy = jest.spyOn(console, "warn").mockImplementation();
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleDebugSpy.mockRestore();
    consoleInfoSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe("log levels", () => {
    it("should log debug messages when log level is debug", () => {
      const logger = new ConsoleLogger("debug");
      logger.debug("test message");

      expect(consoleDebugSpy).toHaveBeenCalledWith(
        expect.stringContaining("[DEBUG] test message"),
      );
    });

    it("should not log debug messages when log level is info", () => {
      const logger = new ConsoleLogger("info");
      logger.debug("test message");

      expect(consoleDebugSpy).not.toHaveBeenCalled();
    });

    it("should log info messages when log level is info", () => {
      const logger = new ConsoleLogger("info");
      logger.info("test message");

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining("[INFO] test message"),
      );
    });

    it("should log warn messages at all levels", () => {
      const logger = new ConsoleLogger("warn");
      logger.warn("test warning");

      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining("[WARN] test warning"),
      );
    });

    it("should log error messages at all levels", () => {
      const logger = new ConsoleLogger("error");
      logger.error("test error");

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("[ERROR] test error"),
      );
    });
  });

  describe("message formatting", () => {
    it("should include timestamp in log messages", () => {
      const logger = new ConsoleLogger("info");
      logger.info("test message");

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\]/,
        ),
      );
    });

    it("should format additional arguments", () => {
      const logger = new ConsoleLogger("info");
      logger.info("test message", { key: "value" }, 123);

      expect(consoleInfoSpy).toHaveBeenCalledWith(
        expect.stringContaining('{"key":"value"} 123'),
      );
    });
  });
});
