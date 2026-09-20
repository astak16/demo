import { createClient } from "redis";
import retryStrategy from "node-redis-retry-strategy";
import { REDIS } from "./index";

const options = {
  // password: "your_redis_password",
  socket: {
    host: REDIS.host,
    port: REDIS.port,
    detect_buffers: true,
    reconnectStrategy: retryStrategy(),
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

export const setValue = async (key, value, time) => {
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
      await client.hSet(key, time, value[time], console.log);
    }
  }
};

export const getValue = async (key) => {
  return await client.get(key);
};

export const delValue = async (key) => {
  const result = await client.del(key);
  if (result === 1) {
    console.log("delete successfully");
  }
  return result;
};
