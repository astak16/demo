import type { NextFunction, Request, Response } from "express";
import Users from "../models/users";
import { getErrorMessage } from "../utils/error";

export async function requireLogin(req: Request, res: Response, next: NextFunction) {
  const userId = req.cookies?.userId;

  if (!userId) {
    res.json({ status: "10001", msg: "当前未登录", result: "" });
    return;
  }

  try {
    const userInfo = await Users.findOne({ userId });
    if (!userInfo) {
      res.json({ status: "1", msg: "未查到用户信息", result: "" });
      return;
    }

    res.locals.userId = userId;
    res.locals.userInfo = userInfo;
    next();
  } catch (error) {
    res.json({ status: "1", msg: getErrorMessage(error), result: "" });
  }
}
