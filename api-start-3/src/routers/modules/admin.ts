import Router from "@koa/router";
import { getTags, addTag, deleteTag, editTag } from "../../controller/content";
import { addRole, getRoles, deleteRole, editRole } from "../../controller/admin";
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

export default router;
