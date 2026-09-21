import mongoose from "../config/DBHelpler.ts";
import dayjs from "dayjs";

const Schema = mongoose.Schema;

const CommentsSchema = new Schema({
  // 'cid': { type: String},
  cid: { type: String, ref: "comments" },
  huid: { type: String, ref: "users" }, // 被点赞用户的id
  uid: { type: String, ref: "users" },
  created: { type: Date },
});

CommentsSchema.pre("save", function (next) {
  this.created = new Date();
});

CommentsSchema.post("save", function (error: Error & { code?: number; name: string }, _doc: unknown, next: (error?: Error) => void) {
  if (error.name === "MongoError" && error.code === 11000) {
    next(new Error("There was a duplicate key error"));
  } else {
    next(error);
  }
});

CommentsSchema.statics = {
  findByTid: function (id) {
    return this.find({ tid: id });
  },
  findByCid: function (id) {
    return this.find({ cid: id });
  },
  getHandsByUid: function (id, page, limit) {
    return this.find({ uid: id })
      .populate({ path: "huid", select: "_id name pic" })
      .populate({ path: "cid", select: "_id content" })
      .skip(page * limit)
      .limit(limit)
      .sort({ created: -1 });
  },
};

const CommentsHandsBase = mongoose.model("comments_hands", CommentsSchema);
type CommentsHandsModel = typeof CommentsHandsBase & {
  getHandsByUid(id: string, page: number, limit: number): ReturnType<typeof CommentsHandsBase.find>;
};

const CommentsHands = CommentsHandsBase as CommentsHandsModel;

export default CommentsHands;
