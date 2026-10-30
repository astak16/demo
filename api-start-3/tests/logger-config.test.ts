import assert from "node:assert/strict";
import { describe, it } from "node:test";
import fs from "node:fs";
import path from "node:path";
import {
  colorizeLogLine,
  createStreamSets,
  DailyDateStream,
  formatLogLine,
  getAccessLogLevel,
  getAppLogLevel,
  getCaller,
  PrettyConsoleStream,
} from "../src/config/logger";

const write = (stream: NodeJS.WritableStream, chunk: string) => new Promise<void>((resolve, reject) => {
  stream.write(chunk, (error?: Error | null) => error ? reject(error) : resolve());
});

describe("logger formatting and streams", () => {
  it("formats structured log entries and passes through malformed JSON", () => {
    const formatted = formatLogLine(JSON.stringify({
      time: 0,
      level: 50,
      service: "api",
      logger: "access",
      caller: "src/test.ts:1",
      msg: "failed",
      requestId: "r-1",
      pid: 12,
      hostname: "host",
    }));
    assert.match(formatted, /ERROR \| api\/access \| src\/test.ts:1 \| failed \| requestId='r-1'/);
    assert.equal(formatLogLine("not-json"), "not-json\n");
  });

  it("handles fallback time, level, message, and scope values", () => {
    const formatted = formatLogLine(JSON.stringify({ level: 999, service: "api", msg: null }));
    assert.match(formatted, /INFO \| api/);
    assert.match(formatted, /\n$/);
    assert.match(formatLogLine(JSON.stringify({ level: 30 })), /\| INFO\n$/);
    assert.match(formatLogLine(JSON.stringify({ time: null, level: null, msg: null, caller: "" })), /\| INFO\n$/);
    assert.match(formatLogLine(JSON.stringify({ time: "2026-01-02T03:04:05Z", level: 30, msg: "string time" })), /2026-01-02 11:04:05 \| INFO/);
  });

  it("resolves caller locations inside and outside the project", (t) => {
    assert.equal(getCaller(`Error\n    at run (${path.join(process.cwd(), "tests/inside.test.ts")}:7:3)`), "tests/inside.test.ts:7");
    assert.equal(getCaller(`Error\n    at ignored (/app/src/config/logger.ts:2:3)\n    at run (${path.join(process.cwd(), "src/index.ts")}:8:4)`), "src/index.ts:8");
    assert.equal(getCaller("Error\n    at run (/tmp/external/file.ts:12:4)"), "file.ts:12");
    assert.equal(getCaller("Error\n    at run (file:///tmp/external/file.ts:13:5)"), "file.ts:13");
    assert.equal(getCaller("Error\n    at run (node_modules/pkg/index.js:1:2)"), "unknown:0");
    assert.equal(getCaller(null as any), "unknown:0");
    assert.match(getCaller()!, /logger-config.test.ts:/);

    t.mock.method(path, "relative", () => "/outside/file.ts");
    assert.equal(getCaller(`Error\n    at run (${path.join(process.cwd(), "tests/inside.test.ts")}:14:6)`), "inside.test.ts:14");
  });

  it("builds development and production stream sets", () => {
    const production = createStreamSets(false);
    const development = createStreamSets(true);
    assert.equal(production.streams.length, 2);
    assert.equal(production.accessStreams.length, 1);
    assert.equal(development.streams.length, 3);
    assert.equal(development.accessStreams.length, 2);
    assert.equal(getAppLogLevel(undefined, false), "info");
    assert.equal(getAppLogLevel(undefined, true), "debug");
    assert.equal(getAppLogLevel("warn", false), "debug");
    assert.equal(getAccessLogLevel(undefined, false), "info");
    assert.equal(getAccessLogLevel(undefined, true), "debug");
    assert.equal(getAccessLogLevel("warn", false), "warn");
  });

  it("colors every log level, rolls log files, and handles stream errors", async (t) => {
    const levels = ["ERROR", "FATAL", "WARN", "DEBUG", "TRACE", "INFO"];
    const colors = levels.map((level) => colorizeLogLine(`date | ${level} | app | source.ts | message\n`));
    for (const output of colors) assert.match(output, /\u001b\[/);
    assert.match(colors[0], /\u001b\[31m/);
    assert.match(colors[2], /\u001b\[33m/);
    assert.match(colors[3], /\u001b\[35m/);
    assert.match(colors[5], /\u001b\[36m/);
    assert.equal(colorizeLogLine("short line"), "\u001b[37mshort line\u001b[0m");
    assert.equal(colorizeLogLine("date | INFO | app | source.ts"), "\u001b[37mdate\u001b[0m | \u001b[36mINFO\u001b[0m | \u001b[37mapp\u001b[0m | \u001b[34msource.ts\u001b[0m");

    const daily = new DailyDateStream("coverage-tests");
    await write(daily, `${JSON.stringify({ level: 30, msg: "first" })}\n`);
    await write(daily, `${JSON.stringify({ level: 30, msg: "same day" })}\n`);
    await write(daily, "\n");
    (daily as any).currentDate = "2000-01-01";
    await write(daily, `${JSON.stringify({ level: 30, msg: "new date" })}\n`);
    await new Promise<void>((resolve) => daily.end(resolve));

    t.mock.method(fs, "createWriteStream", () => { throw new Error("disk unavailable"); });
    const failedOpen = new DailyDateStream("coverage-failure");
    failedOpen.on("error", () => {});
    await assert.rejects(write(failedOpen, `${JSON.stringify({ level: 30, msg: "failure" })}\n`), /disk unavailable/);
    failedOpen.destroy();

    const failedClose = new DailyDateStream("coverage-close-failure");
    const closeError = new Error("close failed");
    (failedClose as any).currentDate = "2000-01-01";
    (failedClose as any).currentStream = {
      once(_event: string, listener: (error: Error) => void) { listener(closeError); return this; },
      end(callback: () => void) { callback(); },
    };
    failedClose.on("error", () => {});
    await assert.rejects(write(failedClose, `${JSON.stringify({ level: 30, msg: "close failure" })}\n`), closeError);
    failedClose.destroy();

    let output = "";
    let stdoutError: Error | undefined;
    t.mock.method(process.stdout, "write", ((chunk: string | Uint8Array, callback?: (error?: Error | null) => void) => {
      output += chunk.toString();
      callback?.(stdoutError);
      return !stdoutError;
    }) as any);
    const pretty = new PrettyConsoleStream();
    await write(pretty, `${JSON.stringify({ level: 40, msg: "warning" })}\n`);
    await write(pretty, "\n");
    assert.match(output, /WARN/);
    assert.match(output, /\u001b\[/);
    stdoutError = new Error("stdout unavailable");
    pretty.on("error", () => {});
    await assert.rejects(write(pretty, `${JSON.stringify({ level: 30, msg: "failure" })}\n`), stdoutError);
    pretty.destroy();
  });

});
