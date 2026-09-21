import mongoose from "../config/DBHelpler.ts";

const PostTagsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  class: { type: String, default: "" },
});

const PostTagsBase = mongoose.model("post_tags", PostTagsSchema);

type PostTagsModel = typeof PostTagsBase & {
  getList(options: Record<string, unknown>, page: number, limit: number): ReturnType<typeof PostTagsBase.find>;
  countList(options: Record<string, unknown>): ReturnType<typeof PostTagsBase.countDocuments>;
};

const PostTags = PostTagsBase as PostTagsModel;

PostTags.getList = function getList(options, page, limit) {
  return this.find(options).skip(page * limit).limit(limit).sort({ name: 1 });
};

PostTags.countList = function countList(options) {
  return this.countDocuments(options);
};

export default PostTags;
