import mongoose from "mongoose";

const Schema = mongoose.Schema;

const PostTagSchema = new Schema(
  {
    _id: { type: String, required: true },
    tagName: { type: String, required: true },
  },
  {
    toJSON: {
      transform(doc, ret) {
        return { _id: ret._id, tagName: ret.tagName, ...("isDeleted" in ret ? { isDeleted: ret.isDeleted } : {}) };
      },
    },
  },
);

const PostTag = mongoose.model("post_tags", PostTagSchema);

export default PostTag;
