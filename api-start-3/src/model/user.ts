import mongoose from "mongoose";
import dayjs from "dayjs";
import Role from "./role";

const { Schema } = mongoose;

const UserSchema = new Schema({
  username: { type: String, index: { unique: true }, sparse: true },
  password: { type: String },
  name: { type: String },
  favs: { type: Number, default: 100 },
  gender: { type: String, default: "" },
  // roles: { type: [String], default: ["user"] },
  roles: { type: [String], ref: Role.modelName },
  pic: { type: String, default: "/img/avatar.jpeg" },
  mobile: { type: String, match: /^1[3-9](\d{9})$/, default: "" },
  status: { type: String, default: "0" },
  regmark: { type: String, default: "" },
  location: { type: String, default: "" },
  isVip: { type: String, default: "0" },
  count: { type: Number, default: 0 },
  openid: { type: String, default: "" },
  unionid: { type: String, default: "" },
});

const UserModel = mongoose.model("users", UserSchema);

export default UserModel;
