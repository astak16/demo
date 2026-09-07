import { getValue } from "@/config/RedisConfig";
import { JWT_SECRET } from "@/config";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

export const getJWTPayload = async (token) => jwt.verify(token.split(" ")[1], JWT_SECRET);

export const checkCode = async (key, value) => {
  const redisData = await getValue(key);
  if (redisData) {
    if (redisData.toLowerCase() === value.toLowerCase()) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
};

const getStats = (path) =>
  new Promise((resolve) => {
    fs.stat(path, (err, stats) => (err ? resolve(false) : resolve(stats)));
  });

const mkdir = (path) => new Promise((resolve) => fs.mkdir(path, (err) => (err ? resolve(false) : resolve(true))));

export const dirExists = async (dir) => {
  const isExists = await getStats(dir);
  // 如果该路径存在且不是文件，返回 true
  if (isExists && isExists.isDirectory()) {
    return true;
  } else if (isExists) {
    // 路径存在，但是是文件，返回 false
    return false;
  }

  // 如果路径不存在
  const tempDir = path.parse(dir).dir; // 获取上级路径
  // 递归判断，如果上级路径不存在，则会创建上级路径
  const status = await dirExists(tempDir);
  if (status) {
    // 上级路径存在时，创建当前目录
    const result = await mkdir(dir);
    console.log("dirExists: ", result);
    return result;
  } else {
    return false;
  }
};

export const rename = (obj, key, newKey) => {
  if (Object.keys(obj).includes(key) !== -1) {
    obj[newKey] = obj[key];
    delete obj[key];
  }
  return obj;
};
