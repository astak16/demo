import mongoose from "../config/DBHelpler.ts";

const Schema = mongoose.Schema;

const MenuSchema = new Schema({
  name: { type: String, default: "" },
  title: { type: String, default: "" },
  path: { type: String, default: "" },
  component: { type: String, default: "" },
  hideInBread: { type: Boolean, default: false },
  HideInMenu: { type: Boolean, default: false },
  notCache: { type: Boolean, default: false },
  icon: { type: String, default: "" },
  sort: { type: String, default: 0 },
  link: { type: String, default: "" },
  redirect: { type: String, default: "" },
  type: { type: String, default: "menu" },
  expand: { type: Boolean, default: true },
});

const OperationSchema = new Schema({
  name: { type: String, default: "" },
  type: { type: String, default: "" },
  method: { type: String, default: "" },
  path: { type: String, default: "" },
  remark: { type: String, default: "" },
});

MenuSchema.add({ children: [MenuSchema], operations: [OperationSchema] });

const Menus = mongoose.model("menus", MenuSchema);

export default Menus;
