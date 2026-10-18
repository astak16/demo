import mongoose from "mongoose";

const Schema = mongoose.Schema;

const PostTagSchema = new Schema({
  _id: { type: String, required: true },
  tagName: { type: String, required: true },
});

const PostTag = mongoose.model("post_tags", PostTagSchema);

export default PostTag;
