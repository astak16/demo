import mongoose from "mongoose";

const Schema = mongoose.Schema;

const PostSchema = new Schema({
  uid: { type: String, ref: "users" },
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
    type: Array,
    default: [],
  },
  isDeleted: { type: Number, default: 0 },
});

const Post = mongoose.model("post", PostSchema);

export default Post;
