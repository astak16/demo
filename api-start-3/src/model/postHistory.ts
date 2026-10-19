import mongoose from "mongoose";
import UserModel from "./user";
import PostModel from "./post";

const Schema = mongoose.Schema;

const PostHistorySchema = new Schema(
  {
    uid: { type: Schema.Types.ObjectId, ref: UserModel.modelName, required: true },
    tid: { type: Schema.Types.ObjectId, ref: PostModel.modelName, required: true },
  },
  {
    statics: {
      addOrUpdateVisitHistory(tid, uid) {
        return this.findOneAndUpdate({ tid, uid }, {}, { upsert: true, new: true, setDefaultsOnInsert: true });
      },
    },
  },
);

PostHistorySchema.index({ tid: 1, uid: 1 }, { unique: true });

const PostHistory = mongoose.model("post_histories", PostHistorySchema);

export default PostHistory;
