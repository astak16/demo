import { createClient } from "redis";
import { REDIS } from "../config";
import logger from "./logger";

const { host, port } = REDIS;

export const client = createClient({
  socket: {
    host,
    port: Number(port),
    reconnectStrategy: (retries) => (retries > 0 && retries % 6 === 0 ? 300_00 : 500),
  },
});

export const connectRedis = async () => {
  client.on("error", (err) => logger.error("Redis Client Error", err));
  await client.connect();
  logger.info("Redis connected successfully");
  client.on("end", () => logger.info("Redis connection has closed"));
  client.on("reconnection", (o) => logger.info("Redis is reconnection", o.attempt, o.delay));
};

export const setValue = async (key: string, value?: string | null | Record<string, string>, time?: number) => {
  if (typeof value === "undefined" || value === null || value === "") {
    return;
  }
  if (typeof value === "string") {
    await client.set(key, value, time ? { EX: time } : undefined);
  } else if (typeof value === "object") {
    for (let i = 0; i < Object.keys(value).length; i++) {
      const time = Object.keys(value)[i];
      await client.hSet(key, time, value[time]);
    }
  }
};

export const getValue = async (key: string) => {
  const type = await client.type(key);
  if (type === "hash") return client.hGetAll(key);
  if (type === "string") return client.get(key);
  return null;
};

export const delValue = async (key: string) => {
  const result = await client.del(key);
  if (result === 1) {
    logger.info("delete successfully");
  }
  return result;
};
