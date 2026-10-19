import type { Middleware } from "koa";
import jwt from "jsonwebtoken";
import { getJWTPayload } from "./Utils";
import { whileList } from "../config";

export const auth: Middleware = async (ctx, next) => {
  if (ctx.method === "OPTIONS") return next();

  const isWhite = whileList.some((p) => ctx.path === p || ctx.path.startsWith(p + "/"));
  const token = ctx.get("Authorization").replace(/^Bearer\s+/i, "");

  if (!token) {
    if (isWhite) return next(); // 白名单：匿名访问
    ctx.status = 401;
    ctx.body = { code: 401, msg: "未登录" };
    return;
  }

  try {
    ctx.state.user = getJWTPayload(`Bearer ${token}`);
  } catch (e) {
    if (isWhite) return next(); // 白名单：token 无效按匿名处理
    ctx.status = 401;
    ctx.body = { code: 401, msg: e instanceof jwt.TokenExpiredError ? "登录过期" : "无效的token" };
    return;
  }
  await next();
};
