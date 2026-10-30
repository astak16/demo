import assert from "node:assert/strict";
import { describe, it } from "node:test";

process.env.NODE_ENV = "production";
const { accessLogger, createStreamSets, default: logger, errorLogger } = await import("../src/config/logger");

describe("production logger configuration", () => {
  it("creates file-only streams and emits through each logger", () => {
    const streams = createStreamSets(false);
    assert.equal(streams.streams.length, 2);
    assert.equal(streams.accessStreams.length, 1);
    logger.info("production app log");
    accessLogger.info("production access log");
    errorLogger.error("production error log");
  });
});
