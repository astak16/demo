import type { Middleware } from "koa";
import type { ZodError, ZodType, z } from "zod";
import { AppContext } from "../../types/types";

const formatError = (error: ZodError) => {
  const msg: Record<string, string[]> = {};
  for (const i of error.issues) {
    const key = String(i.path[0] ?? "_");
    (msg[key] ??= []).push(i.message);
  }
  return msg;
};

// export const validate =
//   (schema: ZodType): Middleware =>
//   async (ctx, next) => {
//     const r = schema.safeParse(ctx.request.body);
//     if (!r.success) {
//       ctx.body = { code: 400, msg: formatError(r.error) };
//       return;
//     }
//     ctx.state.body = r.data;
//     await next();
//   };

export const withBody =
  <S extends ZodType>(schema: S, handler: (ctx: AppContext, body: z.infer<S>) => Promise<void> | void): Middleware =>
  async (ctx) => {
    const r = schema.safeParse(ctx.request.body);
    if (!r.success) {
      ctx.body = { code: 400, msg: formatError(r.error) };
      return;
    }
    await handler(ctx as AppContext, r.data);
  };
