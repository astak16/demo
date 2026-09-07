import Router from "koa-router";
import contentController from "@/api/ContentController";
import userController from "@/api/UserController";

const router = new Router();

router.prefix("/admin");

// 标签页面
// 获取标签列表
// router.get("/get-tags", contentController.getTags);

// // 添加标签
// router.post("/add-tag", contentController.addTag);

// // 删除标签
// router.post("/remove-tag", contentController.removeTag);

// // 编辑标签
// router.post("/edit-tag", contentController.editTag);

// 用户管理
router.get("/users", userController.getUsers);
export default router;
