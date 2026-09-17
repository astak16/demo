import axios from "axios";
import config from "@/config";
import crypto from "crypto";
import WXBizDataCrypt from "./WXBizDataCrypt";

const instance = axios.create({ timeout: 1000 });

export const wxGetOpenData = async (code) => {
  const res = await instance.get(
    `https://api.weixin.qq.com/sns/jscode2session?appid=${config.AppID}&secret=${config.AppSecret}&js_code=${code}&grant_type=authorization_code`,
  );
  return res.data;
};

export const wxGetUserInfo = async (user, code) => {
  // 1. 获取用户的 openData -> session_key
  const data = await wxGetOpenData(code);
  const { session_key: sessionKey, errcode } = data;
  if (sessionKey) {
    //   2. 用户数据进行签名校验 -> sha1 -> session_key + rawData + signature
    const { rawData, signature, encryptedData, iv } = user;
    const sha1 = crypto.createHash("sha1");
    sha1.update(rawData);
    sha1.update(sessionKey);
    if (sha1.digest("hex") !== signature) {
      return new Promise.reject(new Error({ code: 500, msg: "签名校验失败" }));
    }
    const wxBizDataCrypt = new WXBizDataCrypt(config.AppID, sessionKey);
    //   3. 用户加密数据的解密
    const userInfo = wxBizDataCrypt.decryptData(encryptedData, iv);
    return { ...userInfo, ...data, errcode: 0 };
  } else {
    return data;
  }
};
