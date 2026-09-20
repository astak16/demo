import { initRedis } from "@/config/RedisConfig";

export const run = async () => {
  await initRedis();
};
