import mongoose from "mongoose";

const Schema = mongoose.Schema;

const PostTagSchema = new Schema({
  tagName: { type: String, default: "" },
  tagClass: { type: String, default: "" },
});

const PostTag = mongoose.model("post_tags", PostTagSchema);

export default PostTag;
