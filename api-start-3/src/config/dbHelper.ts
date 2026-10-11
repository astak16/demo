import mongoose from "mongoose";
import { DB_URL, DB_NAME, MONGO_HOSTNAME } from "../config";
import logger from "./logger";

export async function connectDB() {
  mongoose.connection.on("connected", () => logger.info(`MongoDB: ${DB_NAME}, DB_HOST: ${MONGO_HOSTNAME} connection opened!`));
  mongoose.connection.on("error", (err) => logger.error("Mongoose connection error: " + err));
  mongoose.connection.on("disconnected", () => logger.info("Mongoose connection disconnected"));

  await mongoose.connect(DB_URL);
}
