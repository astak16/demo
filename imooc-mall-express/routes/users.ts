import express from "express";
import { requireLogin } from "../middleware/auth";
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

router.post("/logout", (req, res) => {
  res.cookie("userId", "", { path: "/", maxAge: -1 });
  res.cookie("userName", "", { path: "/", maxAge: -1 });
  res.json({ status: "0", msg: "", result: "" });
});

router.get("/checkLogin", (req, res) => {
  if (req.cookies.userId) {
    res.json({ status: "0", msg: "", result: req.cookies.userName });
  } else {
    res.json({ status: "10001", msg: "当前未登录", result: "" });
  }
});

router.get("/getCartCount", requireLogin, async (_req, res) => {
  try {
    const userInfo = await Users.findOne({ userId: res.locals.userId });
    if (!userInfo) {
      res.json({ status: "1", msg: "未查到用户信息", result: "" });
      return;
    }
    const cartCount = userInfo.cartList.reduce((total, item) => total + Number(item.productNum), 0);
    res.json({ status: "0", result: cartCount, msg: "" });
  } catch (error) {
    res.json({ status: "1", msg: getErrorMessage(error), result: "" });
  }
});

router.get("/cartList", requireLogin, async (req, res) => {
  const userId = res.locals.userId;
  try {
    const userInfo = await Users.findOne({ userId });
    if (!userInfo) {
      res.json({ status: "1", msg: "未查到用户信息", result: "" });
      return;
    }
    res.json({ status: "0", msg: "", result: userInfo.cartList });
  } catch (error) {
    res.json({ status: "1", msg: getErrorMessage(error), result: "" });
  }
});

router.post("/cardEdit", requireLogin, async (req, res) => {
  const userId = res.locals.userId;
  const { productId, productNum, checked } = req.body;
  try {
    const result = await Users.updateOne(
      { userId, "cartList.productId": productId },
      { $set: { "cartList.$.productNum": productNum, "cartList.$.checked": checked } },
    );
    if (result.matchedCount === 0) {
      res.json({ status: "1", msg: "用户或购物车商品不存在", result: "" });
      return;
    }
    res.json({ status: "0", msg: "", result: "suc" });
  } catch (error) {
    res.json({ status: "1", msg: getErrorMessage(error), result: "" });
  }
});

router.post("/cardDel", requireLogin, async (req, res) => {
  const userId = res.locals.userId;
  const { productId } = req.body;
  try {
    const result = await Users.updateOne(
      { userId, "cartList.productId": productId },
      { $pull: { cartList: { productId } } },
    );
    if (result.matchedCount === 0) {
      res.json({ status: "1", msg: "商品不存在", result: "" });
      return;
    }
    res.json({ status: "0", msg: "", result: "suc" });
  } catch (error) {
    res.json({ status: "1", msg: getErrorMessage(error), result: "" });
  }
});

export default router;
