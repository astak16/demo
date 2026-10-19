import mongoose from "mongoose";

const Schema = mongoose.Schema;

const LinkSchema = new Schema({
  title: { type: String, default: "" },
  link: { type: String, default: "" },
  type: { type: String, default: "link", enum: { values: ["link", "tip"], message: "type 只能是 link 或 tip" } },
  isTop: { type: String, default: "" },
  sort: { type: String, default: "" },
});

const Link = mongoose.model("links", LinkSchema);

export default Link;
