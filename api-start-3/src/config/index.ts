export const port = 3000;

export const MONGO_HOSTNAME = process.env.DB_HOST || "localhost";
const MONGO_PORT = process.env.DB_PORT || "27000";
export const DB_NAME = process.env.DB_NAME || "testdb";

export const DB_URL = `mongodb://${MONGO_HOSTNAME}:${MONGO_PORT}/${DB_NAME}`;
