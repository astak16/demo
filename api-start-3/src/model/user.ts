import mongoose from "mongoose";
import dayjs from "dayjs";

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    username: { type: String, index: { unique: true }, sparse: true },
    password: { type: String },
    name: { type: String },
    favs: { type: Number, default: 100 },
    gender: { type: String, default: "" },
    roles: { type: [String], default: ["user"] },
    pic: { type: String, default: "/img/avatar.jpeg" },
    mobile: { type: String, match: /^1[3-9](\d{9})$/, default: "" },
    status: { type: String, default: "0" },
    regmark: { type: String, default: "" },
    location: { type: String, default: "" },
    isVip: { type: String, default: "0" },
    count: { type: Number, default: 0 },
    openid: { type: String, default: "" },
    unionid: { type: String, default: "" },
  },
  {
    statics: {
      getList(options: any, sort: string, _page: number, limit: number) {
        const page = _page - 1;
        const item = options?.item;
        const rawSearch = options?.search;
        const searchValues = (Array.isArray(rawSearch) ? rawSearch : [rawSearch])
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean);

        let query: Record<string, any> = {};
        if (["name", "username"].includes(item)) {
          query[item] = { $regex: new RegExp(rawSearch) };
        } else {
          query[item] = rawSearch;
        }
        if (item === "roles") {
          query = { roles: { $in: rawSearch } };
        }
        if (item === "created") {
          const [start, end] = searchValues;
          query = { created: { $gte: dayjs(start).format("YYYY-MM-DD"), $lt: dayjs(end).format("YYYY-MM-DD") } };
        }
        return this.find(query)
          .sort({ [sort]: -1 })
          .skip(page * limit)
          .limit(limit);
      },
    },
  },
);

const UserModel = mongoose.model("users", UserSchema);

export default UserModel;
