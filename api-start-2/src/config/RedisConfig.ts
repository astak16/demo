import { createClient } from "redis";
import { REDIS } from "./index.ts";

const options = {
  // password: "your_redis_password",
  socket: {
    host: REDIS.host,
    port: Number(REDIS.port),
    reconnectStrategy: (retries: number) => (retries > 0 && retries % 6 === 0 ? 300_000 : 500),
  },
};

export const client = createClient(options);

export const initRedis = async () => {
  client.on("error", (err) => console.log("Redis Client Error", err));
  await client.connect();
  console.log("Redis connected successfully");
  client.on("end", () => console.log("Redis connection has closed"));
  client.on("reconnecting", (o) => console.log("Redis is reconnecting", o.attempt, o.delay));
};

export const setValue = async (key: string, value: string | Record<string, string> | null | undefined, time?: number) => {
  if (typeof value === "undefined" || value === null || value === "") {
    return;
  }
  if (typeof value === "string") {
    if (typeof time !== "undefined") {
      await client.set(key, value, { EX: time });
    } else {
      await client.set(key, value);
    }
  } else if (typeof value === "object") {
    for (let i = 0; i < Object.keys(value).length; i++) {
      const time = Object.keys(value)[i];
      await client.hSet(key, time, value[time]);
    }
  }
};

export const getValue = async (key: string): Promise<string | null> => {
  const value = await client.get(key);
  return typeof value === "string" ? value : null;
};

export const delValue = async (key: string) => {
  const result = await client.del(key);
  if (result === 1) {
    console.log("delete successfully");
  }
  return result;
};
