import mongoose from "mongoose";
import MenuModel from "./menu";

const Schema = mongoose.Schema;

const RoleSchema = new Schema({
  name: { type: String, default: "" },
  role: { type: String, default: "" },
  desc: { type: String, default: "" },
  menu: { type: [Schema.Types.ObjectId], default: [], ref: MenuModel.modelName },
});

const Role = mongoose.model("roles", RoleSchema);

export default Role;
