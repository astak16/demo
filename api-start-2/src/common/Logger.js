import log4js from "@/config/Log4j";

const logger = log4js.getLogger("application");

export default async (ctx, next) => {
  const start = Date.now();
  await next();
  const resTime = Date.now() - start;

  logger.warn(`[${ctx.method}] - ${ctx.url} - time: ${resTime / 1000}s`);
};
