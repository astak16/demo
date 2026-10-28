import { AuthPayload } from "../../types/types";
import { JWT_SECRET } from "../config";
import { delValue, getValue } from "../config/redisConfig";
import type { SignOptions } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import type { Types } from "mongoose";

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

interface MenuTreeNode {
  _id: Types.ObjectId | string;
  path: string;
  title: string;
  type: string;
  sort?: number;
  component?: string;
  hideInBread?: boolean;
  hideInMenu?: boolean;
  notCache?: boolean;
  icon?: string;
  link?: string;
  children?: MenuTreeNode[];
}

interface RouteMenu {
  _id: Types.ObjectId | string;
  path: string;
  meta: {
    title: string;
    hideInBread?: boolean;
    hideInMenu?: boolean;
    notCache?: boolean;
    icon?: string;
    href?: string;
  };
  component?: string;
  children?: RouteMenu[];
}

const sortObj = <T extends { sort?: number }>(arr: T[]): T[] => {
  return arr.sort((m, n) => (m.sort ?? 0) - (n.sort ?? 0));
};

export const getMenuData = (tree: MenuTreeNode[], rights: string[], flag = false): RouteMenu[] => {
  const arr: RouteMenu[] = [];
  for (const item of sortObj(tree)) {
    // _id 包含在menus中
    // 结构进行改造，删除opertaions
    if (rights.includes(item._id + "") || flag) {
      if (item.type === "menu") {
        arr.push({
          _id: item._id,
          path: item.path,
          meta: {
            title: item.title,
            hideInBread: item.hideInBread,
            hideInMenu: item.hideInMenu,
            notCache: item.notCache,
            icon: item.icon,
          },
          component: item.component,
          children: getMenuData(item.children ?? [], rights),
        });
      } else if (item.type === "link") {
        arr.push({
          _id: item._id,
          path: item.path,
          meta: {
            title: item.title,
            icon: item.icon,
            href: item.link,
          },
        });
      }
    }
  }

  return arr;
};
