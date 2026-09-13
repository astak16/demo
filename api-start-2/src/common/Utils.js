import { getValue } from "@/config/RedisConfig";
import { JWT_SECRET } from "@/config";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";

export const getJWTPayload = async (token) => jwt.verify(token.split(" ")[1], JWT_SECRET);

export const generateToken = (payload, expire = "1h") => {
  if (payload) {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: expire,
    });
  } else {
    throw new Error("生成token失败");
  }
};

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

export const sortMenus = (tree) => {
  tree = sortObj(tree, "sort");
  if (tree.children && tree.children.length > 0) {
    tree.children = sortMenus(tree.children, "sort");
  }
  if (tree.operations && tree.operations.length > 0) {
    tree.operations = sortMenus(tree.operations, "sort");
  }
  return tree;
};

const sortObj = (arr, property) => {
  return arr.sort((m, n) => m[property] - n[property]);
};

export const getMenuData = (treeData, rights, flag) => {
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

export const getRights = (tree, menus) => {
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
