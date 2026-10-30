import mongoose from "mongoose";

const { Schema } = mongoose;

const UserCollectSchema = new Schema(
  { uid: { type: String }, tid: { type: String }, title: { type: String } },
  {
    query: {
      byUid(uid: string) {
        return this.where({ uid });
      },
    },
  },
);

const UserCollect = mongoose.model("user_collects", UserCollectSchema);

export default UserCollect;
