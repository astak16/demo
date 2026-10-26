import Router from "@koa/router";
import { getTags, addTag, deleteTag, editTag } from "../../controller/content";
import { addRole, getRoles, deleteRole, editRole } from "../../controller/admin";
import { getComments, deleteBatchComment } from "../../controller/comment";

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

export default router;
