import type { Middleware } from "koa";
import jwt from "jsonwebtoken";
import { getJWTPayload } from "./Utils";
import { whileList } from "../config";

export const auth: Middleware = async (ctx, next) => {
  if (ctx.method === "OPTIONS") return next();
  if (whileList.some((p) => ctx.path === p || ctx.path.startsWith(p + "/"))) return next();

  const token = ctx.get("Authorization").replace(/^Bearer\s+/i, "");
  if (!token) {
    ctx.status = 401;
    ctx.body = { code: 401, msg: "未登录" };
    return;
  }

  try {
    ctx.state.user = getJWTPayload(token);
  } catch (e) {
    ctx.status = 401;
    ctx.body = { code: 401, msg: e instanceof jwt.TokenExpiredError ? "登录过期" : "无效的token" };
    return;
  }
  await next();
};
