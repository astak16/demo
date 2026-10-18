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
const includeDeletedField = Symbol("includeDeleted");

function removeInternalFields(value: unknown, includeDeleted = false): void {
  if (Array.isArray(value)) {
    value.forEach((item) => removeInternalFields(item, includeDeleted));
  } else if (value && typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) return;
    const record = value as Record<string, unknown>;
    const keepDeleted = includeDeleted || includeDeletedField in record;
    if (!keepDeleted) delete record.isDeleted;
    delete record.password;
    Object.values(record).forEach((item) => removeInternalFields(item, keepDeleted));
  }
}

export function baseFields(schema: Schema) {
  const toJSON = schema.get("toJSON") ?? {};
  const previousTransform = toJSON.transform as
    | ((doc: unknown, ret: Record<string, unknown>, options: unknown) => Record<string, unknown> | void)
    | undefined;
  schema.set("toJSON", {
    ...toJSON,
    versionKey: false,
    transform(doc, ret, options) {
      const result = (previousTransform?.(doc, ret, options) ?? ret) as Record<string, unknown>;
      if ((options as { includeDeleted?: boolean }).includeDeleted || doc.$locals.includeDeleted) {
        Object.defineProperty(result, includeDeletedField, { value: true });
      }
      removeInternalFields(result);
      return result;
    },
  });
  schema.add({
    created: { type: String, default: now },
    updated: { type: String, default: now },
    isDeleted: { type: Number, enum: [0, 1], default: 0 },
  });
  schema.pre(
    [
      "find",
      "findOne",
      "countDocuments",
      "distinct",
      "updateOne",
      "updateMany",
      "findOneAndUpdate",
      "replaceOne",
      "findOneAndReplace",
      "deleteOne",
      "deleteMany",
      "findOneAndDelete",
    ],
    function () {
      if (this.getOptions().includeDeleted) return;
      this.where({ isDeleted: { $in: [0, null] } });
    },
  );
  schema.post(["find", "findOne", "findOneAndUpdate", "findOneAndReplace", "findOneAndDelete"], function (result) {
    if (!this.getOptions().includeDeleted) return;
    for (const doc of Array.isArray(result) ? result : [result]) {
      if (doc instanceof mongoose.Document) doc.$locals.includeDeleted = true;
    }
  });
  schema.set("timestamps", {
    createdAt: "created",
    updatedAt: "updated",
    currentTime: now as unknown as () => Date,
  });
}

mongoose.plugin(baseFields);
