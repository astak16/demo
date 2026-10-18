import mongoose from "mongoose";

const Schema = mongoose.Schema;

const PostTagSchema = new Schema(
  {
    tagName: { type: String, default: "" },
    tagClass: { type: String, default: "" },
  },
  {
    toJSON: {
      transform(_doc, ret: Record<string, any>) {
        delete ret.isDeleted;
        delete ret.created;
        delete ret.updated;
        delete ret.__v;
        return ret;
      },
    },
  },
);

const PostTag = mongoose.model("post_tags", PostTagSchema);

export default PostTag;
