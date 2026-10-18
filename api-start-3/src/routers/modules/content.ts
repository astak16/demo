import Router from "@koa/router";
import { addPost, updatePost, uploadPostById, deletedPost, getPosts } from "../../controller/content";

const router = new Router();

router.prefix("/content");

router.post("/add", addPost);

router.post("/update", updatePost);

router.post("/updateId", uploadPostById);

router.post("/delete", deletedPost);

export default router;
