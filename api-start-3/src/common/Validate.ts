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

type Schemas = {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
};

type Parsed<T extends Schemas> = {
  body: T["body"] extends ZodType ? z.infer<T["body"]> : undefined;
  query: T["query"] extends ZodType ? z.infer<T["query"]> : undefined;
  params: T["params"] extends ZodType ? z.infer<T["params"]> : undefined;
};

export const withValidate =
  <T extends Schemas>(schemas: T, handler: (ctx: AppContext, data: Parsed<T>) => Promise<void> | void): Middleware =>
  async (ctx) => {
    const sources = {
      body: ctx.request.body,
      query: ctx.query,
      params: (ctx as any).params, // koa-router 挂在 ctx.params 上
    } as const;

    const data: Record<string, unknown> = {};
    for (const key of ["body", "query", "params"] as const) {
      const schema = schemas[key];
      if (!schema) continue;

      const r = schema.safeParse(sources[key]);
      if (!r.success) {
        ctx.body = { code: 400, msg: formatError(r.error) };
        return;
      }
      data[key] = r.data;
    }

    await handler(ctx as AppContext, data as Parsed<T>);
  };

export const withBody = <S extends ZodType>(schema: S, handler: (ctx: AppContext, body: z.infer<S>) => Promise<void> | void) =>
  withValidate({ body: schema }, (ctx, { body }) => handler(ctx, body as z.infer<S>));

export const withQuery = <S extends ZodType>(schema: S, handler: (ctx: AppContext, query: z.infer<S>) => Promise<void> | void) =>
  withValidate({ query: schema }, (ctx, { query }) => handler(ctx, query as z.infer<S>));
