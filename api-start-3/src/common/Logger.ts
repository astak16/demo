import type { Next } from "koa";
import { accessLogger } from "../config/logger";
import { AppContext } from "../../types/types";

export default async (ctx: AppContext, next: Next) => {
  const start = Date.now();
  try {
    await next();
  } finally {
    accessLogger.info(
      {
        method: ctx.method,
        url: ctx.originalUrl,
        status: ctx.status,
        durationMs: Date.now() - start,
        userAgent: ctx.get("user-agent") || undefined,
        ip: ctx.ip,
      },
      "request completed",
    );
  }
};
