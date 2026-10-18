import mongoose, { type PopulateOptions } from "mongoose";
import PostTagModel from "./postTag";
import UserModel from "./user";

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
      type: [{ type: Schema.Types.ObjectId, ref: PostTagModel.modelName }],
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
  },
);

PostSchema.pre("init", function (raw) {
  if (Array.isArray(raw.tags)) raw.tags = raw.tags.filter((tag: unknown) => mongoose.isValidObjectId(tag));
});

PostSchema.pre(["find", "findOne"], function () {
  const populate = this.mongooseOptions().populate;
  const tagsPopulate =
    populate && !Array.isArray(populate) && typeof populate === "object"
      ? (populate as unknown as Record<string, PopulateOptions>).tags
      : undefined;
  if (tagsPopulate) {
    this.populate({ ...tagsPopulate, skipInvalidIds: true });
  }
});

const Post = mongoose.model("post", PostSchema);

export default Post;
