import path from "path";

export const port = 3000;
export const REDIS = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASS, //|| "eYVX7EwVmmxKPCDmwMtyKVge8oLd2t81",
};

export const JWT_SECRET = "abcdefghijklmnopqrstuvwxyz";

const MONGO_USERNAME = process.env.DB_USER || "root";
const MONGO_PASSWORD = process.env.DB_PASS || "root";
export const MONGO_HOSTNAME = process.env.DB_HOST || "localhost";
const MONGO_PORT = process.env.DB_PORT || "27000";
export const DB_NAME = process.env.DB_NAME || "testdb";

// mongodb://localhost:10050/
// export const DB_URL = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOSTNAME}:${MONGO_PORT}/${DB_NAME}`;
export const DB_URL = `mongodb://${MONGO_HOSTNAME}:${MONGO_PORT}/${DB_NAME}`;
export const baseUrl = "http://localhost:3000";
export const UploadFilePath = path.join(path.resolve(__dirname, "../../public/uploads"));

export const isDevMode = process.env.NODE_ENV !== "production";

export const adminEmail = ["1500846601@qq.com"];

export const publicPath = [
  /^\/public/,
  /^\/login/,
  /^\/content/,
  /^\/user/,
  /^\/comments/,
  // /^\/admin\/getRoutes(?:\?|$)/,
];

export const AppID = "wxc47d78881f2e620c";
export const AppSecret = "431a25b3bd04845338aa28631c094e7d";

export const subIds = {
  comment: "S7zrpjN9Kq05-4ZG_nlTAYxnARMLWlSW09h54A2JCZo",
  comment1: "ANN2-LhDgrhdFjs7jHOLdTnaxWpQU1LqS3kDIMF9GDs",
  login: "FSQZganmBgaRRoNNlelQ1Qm2u4gx6pVSt69EJfkLbPA",
  fav: "g9FFU43_deHRuez-2FcrASorTSITsJJPYx-GhzvHEIU",
};
