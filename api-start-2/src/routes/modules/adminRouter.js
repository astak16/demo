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
// 查询所有用户
router.get("/users", userController.getUsers);

// 添加用户
router.post("/addUser", userController.addUser);

// 删除指定用户
router.post("/deleteUser", userController.deleteUserById);

// 更新指定用户
router.post("/updateUser", userController.updateUserById);

// 批量更新用户属性
router.post("/updateUserSettings", userController.updateUserBatch);

// 校验用户名是否冲突
router.get("/checkname", userController.checkUsername);

export default router;
