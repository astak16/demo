import mongoose, { Schema } from "mongoose";
import { DB_URL, DB_NAME, MONGO_HOSTNAME } from "../config";
import logger from "./logger";
import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";

dayjs.extend(utc);
dayjs.extend(timezone);

export async function connectDB() {
  mongoose.connection.on("connected", () => logger.info(`MongoDB: ${DB_NAME}, DB_HOST: ${MONGO_HOSTNAME} connection opened!`));
  mongoose.connection.on("error", (err) => logger.error("Mongoose connection error: " + err));
  mongoose.connection.on("disconnected", () => logger.info("Mongoose connection disconnected"));

  await mongoose.connect(DB_URL);
}

const now = () => dayjs().tz("Asia/Shanghai").format("YYYY-MM-DD HH:mm:ss");

export function baseFields(schema: Schema) {
  schema.add({
    created: { type: String, default: now },
    updated: { type: String, default: now },
  });
  schema.set("timestamps", {
    createdAt: "created",
    updatedAt: "updated",
    currentTime: now as unknown as () => Date,
  });
}

mongoose.plugin(baseFields);
