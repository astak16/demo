import { getValue } from "@/config/RedisConfig";
import { JWT_SECRET } from "@/config";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import type { AuthPayload, MenuNode, JsonValue } from "@/types";

export const getJWTPayload = async (token: string): Promise<AuthPayload> => {
  const payload = jwt.verify(token.split(" ")[1], JWT_SECRET);
  if (typeof payload === "string" || !payload || typeof payload !== "object" || !("_id" in payload)) {
    throw new Error("无效的 token");
  }
  return payload as AuthPayload;
};

export const generateToken = (payload: AuthPayload, expire = "1h"): string => {
  if (payload) {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: expire,
    });
  } else {
    throw new Error("生成token失败");
  }
};

export const checkCode = async (key: string, value: string): Promise<boolean> => {
  const redisData = await getValue(key);
  if (typeof redisData === "string") {
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
  if (isExists && typeof isExists !== "boolean" && isExists.isDirectory()) {
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

export const rename = (obj: Record<string, JsonValue>, key: string, newKey: string): Record<string, JsonValue> => {
  if (Object.keys(obj).includes(key)) {
    obj[newKey] = obj[key];
    delete obj[key];
  }
  return obj;
};

export const sortMenus = (tree: MenuNode[]): MenuNode[] => {
  return sortObj(tree, "sort").map((item) => ({
    ...item,
    children: item.children ? sortMenus(item.children) : item.children,
    operations: item.operations ? sortObj(item.operations, "sort") : item.operations,
  }));
};

const sortObj = (arr: MenuNode[], property: "sort"): MenuNode[] => {
  return arr.sort((m, n) => Number(m[property] ?? 0) - Number(n[property] ?? 0));
};

export const getMenuData = (treeData: MenuNode[], rights: string[], flag = false): MenuNode[] => {
  const arr = [];
  for (let i = 0; i < treeData.length; i++) {
    const item = treeData[i];
    if (item.type === "menu") {
      if (rights.includes(item._id.toString()) || flag) {
        arr.push({
          _id: item._id,
          path: item.path,
          meta: { hideInBread: item.hideInBread, hideInMenu: item.HideInMenu, notCache: item.notCache, icon: item.icon, title: item.title },
          component: item.component,
          children: getMenuData(item.children, rights),
        });
      }
    } else if (item.type === "link") {
      arr.push({
        _id: item._id,
        path: item.path,
        meta: { icon: item.icon, title: item.title, href: item.link },
      });
    }
  }
  return sortObj(arr, "sort");
};

const flatten = (arr) => {
  while (arr.some((item) => Array.isArray(item))) {
    arr = [].concat(...arr);
  }
  return arr;
};

export const getRights = (tree: MenuNode[], menus: string[]): string[] => {
  let arr = [];
  for (let item of tree) {
    if (item.operations && item.operations.length > 0) {
      for (let op of item.operations) {
        if (menus.includes(op._id.toString())) {
          arr.push(op.path);
        }
      }
    } else if (item.children && item.children.length > 0) {
      arr.push(getRights(item.children, menus));
    }
  }
  return flatten(arr);
};

const rand = (len = 8) => {
  const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let text = "";
  for (let i = 0; i < len; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

export const getTempName = () => {
  // 返回用户邮箱
  return "uccs_" + rand() + "@qq.com";
};
