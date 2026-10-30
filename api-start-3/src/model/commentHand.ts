import mongoose from "mongoose";
import PostModel from "./post";
import UserModel from "./user";
import CommentModel from "./comment";

const Schema = mongoose.Schema;

const CommentHandsSchema = new Schema({
  cid: { type: Schema.Types.ObjectId, ref: CommentModel.modelName }, // 评论id
  uid: { type: Schema.Types.ObjectId, ref: UserModel.modelName }, // 发表评论用户的id
  chuid: { type: Schema.Types.ObjectId, ref: UserModel.modelName }, // 回复评论用户的id
});

CommentHandsSchema.index({ cid: 1, uid: 1 }, { unique: true });

const CommentHands = mongoose.model("comment_hands", CommentHandsSchema);

export default CommentHands;
