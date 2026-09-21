import { initRedis } from "../config/RedisConfig.ts";

export const run = async () => {
  await initRedis();
};
