import mongoose from "@/config/DBHelpler";
import dayjs from "dayjs";
import { getTempName } from "@/common/Utils";

const Schema = mongoose.Schema;

const UserSchema = new Schema({
  username: { type: String, index: { unique: true }, sparse: true },
  password: { type: String },
  name: { type: String },
  created: { type: Date },
  updated: { type: Date },
  favs: { type: Number, default: 100 },
  gender: { type: String, default: "" },
  roles: { type: Array, default: ["user"] },
  pic: { type: String, default: "/img/avatar.jpeg" },
  mobile: { type: String, match: /^1[3-9](\d{9})$/, default: "" },
  status: { type: String, default: "0" },
  regmark: { type: String, default: "" },
  location: { type: String, default: "" },
  isVip: { type: String, default: "0" },
  count: { type: Number, default: 0 },
  // openid: { type: String, default: "" },
  // unionid: { type: String, default: "" },
});

UserSchema.pre("save", function (next) {
  this.created = dayjs().format("YYYY-MM-DD HH:mm:ss");
  next();
});

UserSchema.pre("update", function (next) {
  this.updated = dayjs().format("YYYY-MM-DD HH:mm:ss");
  next();
});

UserSchema.post("save", function (error, doc, next) {
  if (error.name === "MongoServerError" && error.code === 11000) {
    next(new Error("用户名已存在"));
  } else {
    next(error);
  }
});

UserSchema.statics = {
  findOrCreateByMobile(user) {
    return this.findOne({ mobile: user.mobile }, { unionid: 0, password: 0 }).then(
      (obj) => obj || this.create({ mobile: user.mobile, username: getTempName(), name: getTempName(), roles: ["user"] }),
    );
  },
  findOrCreateByUnionid(user) {
    return this.findOne({ unionid: user.unionid }, { unionid: 0, password: 0 }).then(
      (obj) =>
        obj ||
        this.create({
          openid: user.openid,
          unionid: user.unionid,
          username: getTempName(),
          name: user.nickName,
          roles: ["user"],
          gender: user.gender,
          pic: user.avatarUrl,
          location: user.city,
        }),
    );
  },
  findByID: function (id) {
    // 后面的对象中是不需要查出来的
    return this.findOne({ _id: id }, { password: 0, username: 0, mobile: 0 });
  },
  getList(options, sort, page, limit) {
    return this.find({ ...options }, { password: 0, mobile: 0 })
      .sort({ [sort]: -1 })
      .skip(page * limit)
      .limit(limit);
  },
  countList(options) {
    return this.find(options).countDocuments();
  },
  getTotalSign(page, limit) {
    return this.find({})
      .skip(page * limit)
      .limit(limit)
      .sort({ count: -1 });
  },
  getTotalSignCount(page, limit) {
    return this.find({}).countDocuments();
  },
};

const UserModel = mongoose.model("users", UserSchema);

export default UserModel;
