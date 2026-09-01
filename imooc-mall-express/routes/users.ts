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
  const cartCount = res.locals.userInfo.cartList.reduce(
    (total: number, item: { productNum: number }) => total + Number(item.productNum),
    0,
  );
  res.json({ status: "0", result: cartCount, msg: "" });
});

router.get("/cartList", requireLogin, (_req, res) => {
  res.json({ status: "0", msg: "", result: res.locals.userInfo.cartList });
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

router.post("/editCheckAll", requireLogin, async (req, res) => {
  const userInfo = res.locals.userInfo;
  const checkAll = req.body.checkAll ? "1" : "0";
  try {
    const cartList = userInfo.cartList;
    cartList.forEach((item) => {
      item.checked = checkAll;
    });
    await userInfo.save();
    res.json({ status: "0", msg: "", result: "suc" });
  } catch (error) {
    res.json({ status: "1", msg: getErrorMessage(error), result: "" });
  }
});

router.post("/addAddress", requireLogin, async (req, res) => {
  const userInfo = res.locals.userInfo;
  const { userName, streetName, postCode, tel } = req.body;
  const isDefault = req.body.isDefault === true || req.body.isDefault === "true";
  try {
    const address = {
      addressId: `${Date.now()}${Math.floor(Math.random() * 1000)}`,
      userName,
      streetName,
      postCode,
      tel,
      isDefault,
    };

    if (isDefault) {
      userInfo.addressList.forEach((item) => {
        item.isDefault = false;
      });
    }
    userInfo.addressList.push(address);
    await userInfo.save();
    res.json({ status: "0", msg: "", result: "suc" });
  } catch (error) {
    res.json({ status: "1", msg: getErrorMessage(error), result: "" });
  }
});

router.get("/addressList", requireLogin, (_req, res) => {
  res.json({ status: "0", result: res.locals.userInfo.addressList, msg: "" });
});

router.post("/setDefault", requireLogin, async (req, res) => {
  const userInfo = res.locals.userInfo;
  const { addressId } = req.body;
  const addressList = userInfo.addressList;
  if (!addressId) {
    res.json({ status: "1003", msg: "addressId 不存在", result: "" });
    return;
  }
  const defaultAddress = addressList.find((item) => item.addressId === addressId);
  if (!defaultAddress) {
    res.json({ status: "1", msg: "地址不存在", result: "" });
    return;
  }

  try {
    addressList.forEach((item) => {
      item.isDefault = item.addressId === addressId;
    });
    await userInfo.save();
    res.json({ status: "0", msg: "", result: "" });
  } catch (error) {
    res.json({ status: "1", msg: getErrorMessage(error), result: "" });
  }
});

export default router;
