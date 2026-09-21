import { getValue } from "../config/RedisConfig.ts";
import { getJWTPayload } from "./Utils.ts";
import { publicPath } from "../config/index.ts";
import AdminController from "../api/AdminController.ts";
import type { Next } from "koa";
import type { AppContext } from "../types.ts";

export default async (ctx: AppContext, next: Next) => {
  const headers = ctx.header.authorization;
  if (typeof headers !== "undefined") {
    const obj = await getJWTPayload(headers);
    if (obj && obj._id) {
      ctx._id = obj._id;
      const adminValue = await getValue("admin");
      const admins: string[] = adminValue ? JSON.parse(adminValue) : [];
      if (admins.includes(obj._id)) {
        ctx.isAdmin = true;
        await next();
        return;
      } else {
        ctx.isAdmin = false;
      }
    }
  }
  // 1. 过滤掉公众路径
  // const { publicPath } = config;
  if (publicPath.some((item) => item.test(ctx.url))) {
    await next();
    return;
  }
  // 2. 根据用户的 roles -> menus -> operations
  const operations = await AdminController.getOperations(ctx);
  // 3. 判断用户的请求路径是否在 operations 里面，如果在放行，否则禁止访问
  if (operations.includes(ctx.path)) {
    await next();
  } else {
    ctx.throw(401);
  }
};
