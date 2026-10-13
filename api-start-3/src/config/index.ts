export const port = 3000;

export const MONGO_HOSTNAME = process.env.DB_HOST || "localhost";
const MONGO_PORT = process.env.DB_PORT || "27000";
export const DB_NAME = process.env.DB_NAME || "testdb2";

export const DB_URL = `mongodb://${MONGO_HOSTNAME}:${MONGO_PORT}/${DB_NAME}`;

export const baseUrl = process.env.NODE_ENV === "production" ? "http://localhost:8080" : "http://localhost:8080";

export const JWT_SECRET = "abcdefghijklmnopqrstuvwxyz";

export const REDIS = {
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASS, //|| "eYVX7EwVmmxKPCDmwMtyKVge8oLd2t81",
};

export const whileList: string[] = ["/public", "/login", "/test"];

export const isDevMode = process.env.NODE_ENV !== "production";
