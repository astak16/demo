import Router from "@koa/router";
import { getTags, addTag, deleteTag, editTag } from "../../controller/content";
import {
  addRole,
  getRoles,
  deleteRole,
  editRole,
  getMenus,
  addMenu,
  updateMenu,
  deleteMenu,
  getRolesNames,
  getRoutes,
} from "../../controller/admin";
import { getComments, deleteBatchComment, updateCommentsBatch } from "../../controller/comment";
import { getUsers, updateUser, deleteUser, addUser, updateUserSettings, checkUsername } from "../../controller/user";

const router = new Router();

router.prefix("/admin");

router.get("/getTags", getTags);

router.post("/addTag", addTag);

router.post("/deleteTag", deleteTag);

router.post("/editTag", editTag);

router.post("/addRole", addRole);

router.post("/editRole", editRole);

router.post("/deleteRole", deleteRole);

router.get("/getRoles", getRoles);

router.get("/comment/list", getComments);

router.post("/deleteComments", deleteBatchComment);

router.post("/updateCommentsBatch", updateCommentsBatch);

router.get("/users", getUsers);

router.post("/addUser", addUser);

router.post("/deleteUser", deleteUser);

router.post("/updateUser", updateUser);

router.post("/updateUserSettings", updateUserSettings);

router.get("/checkUsername", checkUsername);

router.get("/getMenus", getMenus);

router.post("/addMenu", addMenu);

router.post("/updateMenu", updateMenu);

router.post("/deleteMenu", deleteMenu);

router.get("/getRolesNames", getRolesNames);

router.get("/getRoutes", getRoutes);

export default router;
