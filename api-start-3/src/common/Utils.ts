import { AuthPayload } from "../../types/types";
import { JWT_SECRET } from "../config";
import { delValue, getValue } from "../config/redisConfig";
import type { SignOptions } from "jsonwebtoken";
import jwt from "jsonwebtoken";

export const checkCode = async (key: string, value: string): Promise<boolean> => {
  const redisValue = await getValue(key);
  // delValue(key);
  if (typeof redisValue === "string") {
    const isBoolean = redisValue.toLocaleLowerCase() === value.toLocaleLowerCase();
    return isBoolean;
  } else {
    return false;
  }
};

export const generateToken = (payload: AuthPayload, expire: SignOptions["expiresIn"] = "1h") => {
  if (payload) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: expire });
  } else {
    throw new Error("生成 token 失败");
  }
};

export const getJWTPayload = (token: string): AuthPayload => {
  return jwt.verify(token.split(" ")[1], JWT_SECRET) as AuthPayload;
};
