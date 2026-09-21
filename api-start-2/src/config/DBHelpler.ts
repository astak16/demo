import mongoose from "mongoose";
import { DB_URL, DB_NAME, MONGO_HOSTNAME } from "./index.ts";

mongoose.connect(DB_URL);

// 连接成功
mongoose.connection.on("connected", () => {
  console.log(`MongoDB: ${DB_NAME}, DB_HOST: ${MONGO_HOSTNAME} connection opened! `);
});

// 连接异常
mongoose.connection.on("error", (err) => {
  console.log("Mongoose connection error: " + err);
});

// 断开连接
mongoose.connection.on("disconnected", () => {
  console.log("Mongoose connection disconnected");
});

export default mongoose;
