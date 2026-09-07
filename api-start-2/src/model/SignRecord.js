import mongoose from "@/config/DBHelpler";
import dayjs from "dayjs";

const Schema = mongoose.Schema;

const SignRecordSchema = new Schema({
  uid: { type: String, ref: "users" },
  created: { type: Date },
  favs: { type: Number },
});

SignRecordSchema.pre("save", function (next) {
  this.created = dayjs().format("YYYY-MM-DD HH:mm:ss");
  next();
});

SignRecordSchema.pre("update", function (next) {
  this.updated = dayjs().format("YYYY-MM-DD HH:mm:ss");
  next();
});

SignRecordSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoServerError" && error.code === 11000) {
    next(new Error("用户名已存在"));
  } else {
    next(error);
  }
});

SignRecordSchema.statics = {
  findByUid: function (uid) {
    return this.findOne({ uid }).sort({ created: -1 });
  },
};

const SignRecord = mongoose.model("sign_record", SignRecordSchema);

export default SignRecord;
