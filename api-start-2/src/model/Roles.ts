import mongoose from "mongoose";

const Schema = mongoose.Schema;

const RoleSchema = new Schema({
  name: { type: String, default: "" },
  role: { type: String, default: "" },
  desc: { type: String, default: "" },
  menu: { type: [String], default: [] },
});

const Roles = mongoose.model("roles", RoleSchema);

export default Roles;
