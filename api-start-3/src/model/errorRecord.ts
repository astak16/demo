import mongoose from "mongoose";
import UserModel from "./user";

const Schema = mongoose.Schema;

const ErrorRecordSchema = new Schema({
  message: { type: String, default: "" }, // 错误信息
  code: { type: String, default: "" }, // response status
  method: { type: String, default: "" }, // 请求的类型
  path: { type: String, default: "" }, // 请求的路径
  param: { type: Schema.Types.Mixed, default: "" }, // 请求的参数
  userId: { type: Schema.Types.ObjectId, default: "", ref: UserModel.modelName }, // 当前登录用户
  stack: { type: String, default: "" },
});

const ErrorRecord = mongoose.model("error_records", ErrorRecordSchema);

export default ErrorRecord;
