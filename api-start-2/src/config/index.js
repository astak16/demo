import path from "path";

export const port = 3000;
export const REDIS = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASS || "eYVX7EwVmmxKPCDmwMtyKVge8oLd2t81",
};

export const JWT_SECRET = "abcdefghijklmnopqrstuvwxyz";

const MONGO_USERNAME = process.env.DB_USER || "root";
const MONGO_PASSWORD = process.env.DB_PASS || "root";
export const MONGO_HOSTNAME = process.env.DB_HOST || "localhost";
const MONGO_PORT = process.env.DB_PORT || "10050";
export const DB_NAME = process.env.DB_NAME || "testdb";

// mongodb://localhost:10050/
// export const DB_URL = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOSTNAME}:${MONGO_PORT}/${DB_NAME}`;
export const DB_URL = `mongodb://${MONGO_HOSTNAME}:${MONGO_PORT}/${DB_NAME}`;
export const baseUrl = "http://localhost:3000";
export const UploadFilePath = path.join(path.resolve(__dirname, "../../public/uploads"));
