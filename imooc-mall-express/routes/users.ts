import express from "express";
import Users from "../models/users";
import { getErrorMessage } from "../utils/error";

const router = express.Router();

router.post("/login", async (req, res) => {
  const { userName, userPwd } = req.body;
  const param = { userName, userPwd };
  try {
    const userInfo = await Users.findOne(param);
    if (!userInfo) {
      res.json({ status: "1", msg: "账号密码错误", result: "" });
      return;
    }
    res.cookie("userId", userInfo.userId, {
      path: "/",
      maxAge: 1000 * 60 * 60,
    });
    res.cookie("userName", userInfo.userName, {
      path: "/",
      maxAge: 1000 * 60 * 60,
    });
    res.json({ status: "0", result: { userName: userInfo.userName }, msg: "" });
  } catch (error: unknown) {
    res.json({ status: "1", msg: getErrorMessage(error), result: "" });
  }
});

export default router;
