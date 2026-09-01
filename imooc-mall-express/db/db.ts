import mongoose from "mongoose";

export async function connectDatabase(): Promise<void> {
  mongoose.connection.on("connected", () => {
    console.log("数据库连接成功");
  });

  mongoose.connection.on("disconnected", () => {
    console.log("数据库连接断开");
  });

  mongoose.connection.on("error", (error) => {
    console.log("数据库连接错误: ", error);
  });

  await mongoose.connect("mongodb://localhost:27000/dumall");
}
