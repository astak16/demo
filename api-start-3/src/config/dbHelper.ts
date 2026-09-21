import mongoose from "mongoose";
import { DB_URL, DB_NAME, MONGO_HOSTNAME } from "../config";

export async function connectDB() {
  mongoose.connection.on("connected", () => console.log(`MongoDB: ${DB_NAME}, DB_HOST: ${MONGO_HOSTNAME} connection opened!`));
  mongoose.connection.on("error", (err) => console.log("Mongoose connection error: " + err));
  mongoose.connection.on("disconnected", () => console.log("Mongoose connection disconnected"));

  await mongoose.connect(DB_URL);
}
