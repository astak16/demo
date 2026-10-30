import pino, { type Logger } from "pino";
import { isDevMode } from ".";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Writable } from "node:stream";
import fs from "node:fs";
import { inspect } from "node:util";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const logsDir = path.join(projectRoot, "logs");
fs.mkdirSync(logsDir, { recursive: true });

const localDate = () => {
  const now = new Date();
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const formatDateTime = (value: unknown) => {
  const date = new Date(typeof value === "number" ? value : String(value));
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const levelNames: Record<number, string> = {
  10: "TRACE",
  20: "DEBUG",
  30: "INFO",
  40: "WARN",
  50: "ERROR",
  60: "FATAL",
};

export const formatLogLine = (line: string) => {
  try {
    const entry = JSON.parse(line) as Record<string, unknown>;
    const time = formatDateTime(entry.time ?? Date.now());
    const level = levelNames[Number(entry.level)] ?? "INFO";
    const message = String(entry.msg ?? "");
    const scope = [entry.service, entry.logger].filter(Boolean).join("/");
    const caller = entry.caller ? String(entry.caller) : "";
    const context = Object.entries(entry)
      .filter(([key]) => !["time", "level", "msg", "service", "logger", "caller", "pid", "hostname"].includes(key))
      .map(([key, value]) => `${key}=${inspect(value, { depth: 3, breakLength: Infinity })}`)
      .join(" ");

    return [time, level, scope, caller, message, context].filter(Boolean).join(" | ") + "\n";
  } catch {
    return `${line}\n`;
  }
};

export const colorizeLogLine = (line: string) => {
  const reset = "\u001b[0m";
  const white = "\u001b[37m";
  const levelColor =
    line.includes(" | ERROR |") || line.includes(" | FATAL |")
      ? "\u001b[31m"
      : line.includes(" | WARN |")
        ? "\u001b[33m"
        : line.includes(" | DEBUG |") || line.includes(" | TRACE |")
          ? "\u001b[35m"
          : "\u001b[36m";
  const fileColor = "\u001b[34m";
  const hasNewline = line.endsWith("\n");
  const parts = line.trimEnd().split(" | ");
  if (parts.length < 4) return `${white}${line}${reset}`;

  const colored = [
    `${white}${parts[0]}${reset}`,
    `${levelColor}${parts[1]}${reset}`,
    `${white}${parts[2]}${reset}`,
    `${fileColor}${parts[3]}${reset}`,
    ...parts.slice(4).map((part) => `${white}${part}${reset}`),
  ].join(" | ");
  return colored + (hasNewline ? "\n" : "");
};

export class DailyDateStream extends Writable {
  private readonly type: string;
  private currentDate = "";
  private currentStream: fs.WriteStream | undefined;
  constructor(type: string) {
    super();
    this.type = type;
    fs.mkdirSync(path.join(logsDir, type), { recursive: true });
  }

  private async ensureCurrentStream() {
    const date = localDate();

    if (this.currentStream && this.currentDate === date) return;
    if (this.currentStream) {
      await new Promise<void>((resolve, reject) => {
        this.currentStream!.once("error", reject).end(resolve);
      });
    }
    this.currentDate = date;
    this.currentStream = fs.createWriteStream(path.join(logsDir, this.type, `${date}.log`), { flags: "a" });
  }

  override _write(chunk: Buffer, encoding: BufferEncoding, callback: (error?: Error | null) => void) {
    const formattedChunk = chunk.toString().split(/\r?\n/).filter(Boolean).map(formatLogLine).join("");
    this.ensureCurrentStream()
      .then(() => this.currentStream!.write(formattedChunk, callback))
      .catch(callback);
  }
}

export class PrettyConsoleStream extends Writable {
  override _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    process.stdout.write(chunk.toString().split(/\r?\n/).filter(Boolean).map(formatLogLine).map(colorizeLogLine).join(""), callback);
  }
}

const appLog = new DailyDateStream("app");
const errorLog = new DailyDateStream("error");
const accessLog = new DailyDateStream("access");

export const getAppLogLevel = (configuredLevel: string | undefined, devMode: boolean) =>
  configuredLevel || devMode ? "debug" : "info";
export const getAccessLogLevel = (configuredLevel: string | undefined, devMode: boolean) =>
  configuredLevel || (devMode ? "debug" : "info");
export const createStreamSets = (devMode: boolean) => ({
  streams: [
    { level: "info" as const, stream: appLog },
    { level: "error" as const, stream: errorLog },
    ...(devMode ? [{ level: "info" as const, stream: new PrettyConsoleStream() }] : []),
  ] satisfies pino.StreamEntry[],
  accessStreams: [
    { level: "info" as const, stream: accessLog },
    ...(devMode ? [{ level: "info" as const, stream: new PrettyConsoleStream() }] : []),
  ] satisfies pino.StreamEntry[],
});

const { streams, accessStreams } = createStreamSets(isDevMode);

export const getCaller = (trace: string | undefined = new Error().stack) => {
  const stack = trace?.split("\n").slice(1) ?? [];
  for (const frame of stack) {
    if (frame.includes("node_modules") || frame.includes("src/config/logger.ts")) continue;
    const match = frame.match(/((?:file:\/\/)?\/[^():]+):(\d+):\d+/);
    if (match) {
      const fileName = match[1].replace(/^file:\/*/, "/");
      const absoluteFile = path.isAbsolute(fileName) ? fileName : path.resolve(projectRoot, fileName);
      const file = path.relative(projectRoot, absoluteFile).replaceAll("\\", "/");
      if (file.startsWith("../") || path.isAbsolute(file)) return path.basename(absoluteFile) + ":" + match[2];
      return `${file}:${match[2]}`;
    }
  }
  return "unknown:0";
};

export const logger: Logger = pino(
  {
    level: getAppLogLevel(process.env.LOG_LEVEL, isDevMode),
    base: { service: "api-start" },
    timestamp: pino.stdTimeFunctions.isoTime,
    mixin: () => ({ caller: getCaller() }),
  },
  pino.multistream(streams),
);

export const accessLogger: Logger = pino(
  {
    level: getAccessLogLevel(process.env.LOG_LEVEL, isDevMode),
    base: { service: "api-start", logger: "access" },
    timestamp: pino.stdTimeFunctions.isoTime,
    mixin: () => ({ caller: getCaller() }),
  },
  pino.multistream(accessStreams),
);

export const errorLogger = logger.child({ logger: "error" });

export default logger;
