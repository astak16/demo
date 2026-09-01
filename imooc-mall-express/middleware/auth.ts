import type { NextFunction, Request, Response } from "express";

export function requireLogin(req: Request, res: Response, next: NextFunction) {
  const userId = req.cookies?.userId;

  if (!userId) {
    res.json({ status: "10001", msg: "当前未登录", result: "" });
    return;
  }

  res.locals.userId = userId;
  next();
}
