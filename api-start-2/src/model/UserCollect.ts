import dayjs from "dayjs";
import moogoose from "../config/DBHelpler.ts";

const Schema = moogoose.Schema;

const UserCollectSchema = new Schema({
  uid: { type: String },
  tid: { type: String },
  title: { type: String },
  created: { type: Date },
});

UserCollectSchema.pre("save", function (next) {
  this.created = new Date();
});

UserCollectSchema.post("save", function (error: Error & { code?: number; name: string }, _doc: unknown, next: (error?: Error) => void) {
  if (error.name === "MongoError" && error.code === 11000) {
    next(new Error("There was a duplicate key error"));
  } else {
    next(error);
  }
});

UserCollectSchema.statics = {
  // 查询特定用户的收藏数据
  getListByUid: function (id, page, limit) {
    return this.find({ uid: id })
      .skip(limit * page)
      .limit(limit)
      .sort({ created: -1 });
  },
  // 查询总数
  countByUid: function (id) {
    return this.find({ uid: id }).countDocuments();
  },
};

const UserCollectBase = moogoose.model("user_collect", UserCollectSchema);
type UserCollectWithStatics = typeof UserCollectBase & {
  getListByUid(id: string, page: number, limit: number): ReturnType<typeof UserCollectBase.find>;
  countByUid(id: string): ReturnType<typeof UserCollectBase.countDocuments>;
};

const UserCollect = UserCollectBase as UserCollectWithStatics;

export default UserCollect;
