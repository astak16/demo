import crypto from "crypto";

interface DecryptedData {
  watermark: { appid: string };
  [key: string]: unknown;
}

class WXBizDataCrypt {
  private readonly appId: string;
  private readonly sessionKey: string;

  constructor(appId: string, sessionKey: string) {
    this.appId = appId;
    this.sessionKey = sessionKey;
  }

  decryptData(encryptedData: string, iv: string): DecryptedData {
  // base64 decode
  const sessionKey = Buffer.from(this.sessionKey, "base64");
  const encryptedBuffer = Buffer.from(encryptedData, "base64");
  const ivBuffer = Buffer.from(iv, "base64");
  let text: string;
  let decoded: DecryptedData;
  try {
    // 解密
    const decipher = crypto.createDecipheriv("aes-128-cbc", sessionKey, ivBuffer);
    // 设置自动 padding 为 true，删除填充补位
    decipher.setAutoPadding(true);
    text = decipher.update(encryptedBuffer, undefined, "utf8");
    text += decipher.final("utf8");

    decoded = JSON.parse(text) as DecryptedData;
  } catch {
    throw new Error("Illegal Buffer");
  }

  if (decoded.watermark.appid !== this.appId) {
    throw new Error("Illegal Buffer");
  }

  return decoded;
  }
}

export default WXBizDataCrypt;
