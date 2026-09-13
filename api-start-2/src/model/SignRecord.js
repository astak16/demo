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
  getLatestSign(page, limit) {
    return this.find({})
      .populate({ path: "uid", select: "_id name pic" })
      .skip(page * limit)
      .limit(limit)
      .sort({ create: -1 });
  },
  getSignCount() {
    return this.find({}).countDocuments();
  },
  getTopSign(page, limit) {
    return this.find({ created: { $gte: dayjs("2025-12-24").format("YYYY-MM-DD 00:00:00") } })
      .populate({ path: "uid", select: "_id name pic" })
      .skip(page * limit)
      .limit(limit)
      .sort({ create: 1 });
  },
  getTopSignCount() {
    return this.find({ created: { $gte: dayjs().format("YYYY-MM-DD 00:00:00") } }).countDocuments();
  },
};

const SignRecord = mongoose.model("sign_record", SignRecordSchema);

export default SignRecord;
