import mongoose from "mongoose";
import PostTagModel from "./postTag";
import UserModel from "./user";
import dayjs from "dayjs";

const Schema = mongoose.Schema;

const PostSchema = new Schema(
  {
    uid: { type: Schema.Types.ObjectId, ref: UserModel.modelName },
    title: { type: String },
    content: { type: String },
    created: { type: Date },
    catalog: { type: String },
    //   fav: { type: String },
    fav: { type: Number, default: 0 },
    isEnd: { type: String, default: "0" },
    reads: { type: Number, default: 0 },
    answer: { type: Number, default: 0 },
    status: { type: String, default: "0" },
    isTop: { type: String, default: "0" },
    sort: { type: String, default: 100 },
    tags: {
      type: [{ type: String, ref: PostTagModel.modelName }],
      default: [],
    },
  },
  {
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        if (!_doc.populated("uid")) return ret;
        const output = ret as Record<string, unknown>;
        const author = output.uid as { _id?: unknown; name?: string } | null;
        output.uid = author?._id ?? null;
        output.uname = author?.name ?? null;
        return ret;
      },
    },
    statics: {
      getTopWeek() {
        return this.find({ created: { $gte: dayjs().subtract(7, "day").toDate() } }, { answer: 1, title: 1 })
          .sort({ answer: -1 })
          .limit(15);
      },
    },
  },
);

const Post = mongoose.model("posts", PostSchema);

export default Post;
