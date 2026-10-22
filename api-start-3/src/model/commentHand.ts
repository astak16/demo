import mongoose from "mongoose";
import PostModel from "./post";
import UserModel from "./user";
import CommentModel from "./comment";

const Schema = mongoose.Schema;

const CommentHandsSchema = new Schema({
  cid: { type: Schema.Types.ObjectId, ref: CommentModel.modelName },
  uid: { type: Schema.Types.ObjectId, ref: UserModel.modelName },
  chuid: { type: Schema.Types.ObjectId, ref: UserModel.modelName },
});

CommentHandsSchema.index({ cid: 1, uid: 1 }, { unique: true });

const CommentHands = mongoose.model("comment_hands", CommentHandsSchema);

export default CommentHands;
