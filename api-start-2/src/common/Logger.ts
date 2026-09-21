import log4js from "../config/Log4j.ts";
import type { Next } from "koa";
import type { AppContext } from "../types.ts";

const logger = log4js.getLogger("application");

export default async (ctx: AppContext, next: Next) => {
  const start = Date.now();
  await next();
  const resTime = Date.now() - start;

  logger.warn(`[${ctx.method}] - ${ctx.url} - time: ${resTime / 1000}s`);
};
