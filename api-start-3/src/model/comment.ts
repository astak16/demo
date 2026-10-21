import mongoose from "mongoose";
import PostModel from "./post";
import UserModel from "./user";

const Schema = mongoose.Schema;

const CommentsSchema = new Schema(
  {
    tid: { type: Schema.Types.ObjectId, ref: PostModel.modelName },
    uid: { type: Schema.Types.ObjectId, ref: UserModel.modelName },
    cuid: { type: Schema.Types.ObjectId, ref: UserModel.modelName },
    content: { type: String },
    hands: { type: Number, default: 0 },
    status: { type: String, default: "1" },
    isRead: { type: String, default: "0" },
    isBest: { type: String, default: "0" },
  },
  //   { toJSON: { virtuals: true } },
);

const Comments = mongoose.model("comments", CommentsSchema);

export default Comments;
