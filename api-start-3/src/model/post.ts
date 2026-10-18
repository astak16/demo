import mongoose, { type PopulateOptions } from "mongoose";
import PostTagModel from "./postTag";
import UserModel from "./user";

const Schema = mongoose.Schema;

const PostSchema = new Schema({
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
});

PostSchema.pre(["find", "findOne"], function () {
  const populate = this.mongooseOptions().populate;
  const tagsPopulate = populate && !Array.isArray(populate) && typeof populate === "object"
    ? (populate as unknown as Record<string, PopulateOptions>).tags
    : undefined;
  if (tagsPopulate) {
    const includeDeletedTags = (this.getOptions() as unknown as { includeDeletedTags?: boolean }).includeDeletedTags === true;
    this.populate({
      ...tagsPopulate,
      skipInvalidIds: true,
      ...(includeDeletedTags && {
        select: `${tagsPopulate.select ?? ""} isDeleted`.trim(),
        options: { ...tagsPopulate.options, includeDeleted: true } as unknown as PopulateOptions["options"],
      }),
    });
  }
});

PostSchema.post("find", function (posts) {
  if (!this.mongooseOptions().lean || !this.getPopulatedPaths().includes("uid")) return;
  for (const post of posts as Array<Record<string, unknown>>) {
    const author = post.uid as { _id?: unknown; name?: string } | null;
    if (author && typeof author === "object" && "_id" in author) {
      post.uid = author._id;
      post.uname = author.name ?? null;
    } else if ("uid" in post) {
      post.uname = null;
    }
  }
});

const Post = mongoose.model("post", PostSchema);

export default Post;
