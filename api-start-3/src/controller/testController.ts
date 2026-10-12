import { Context } from "koa";
import TestModel from "../model/test";

export const testIndex = async (ctx: Context) => {
  const result = await TestModel.find();

  ctx.body = result;
};
