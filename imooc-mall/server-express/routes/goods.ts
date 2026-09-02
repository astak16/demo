import express from "express";

import Goods from "../models/goods";
import Users, { type CartItem } from "../models/users";

const router = express.Router();

function parsePositiveInteger(value: unknown, fallback: number): number {
  if (typeof value !== "string") {
    return fallback;
  }

  const parsedValue = Number.parseInt(value, 10);
  return parsedValue > 0 ? parsedValue : fallback;
}

router.get("/list", async (req, res) => {
  const page = parsePositiveInteger(req.query.page, 1);
  const pageSize = parsePositiveInteger(req.query.pageSize, 5);
  const sort = req.query.sort === "-1" ? -1 : 1;

  try {
    const list = await Goods.find({})
      .sort({ salePrice: sort })
      .skip((page - 1) * pageSize)
      .limit(pageSize);

    res.json({
      status: "0",
      msg: "",
      result: { count: list.length, list },
    });
  } catch (error: unknown) {
    res.json({ status: "1", msg: getErrorMessage(error) });
  }
});

router.post("/addCart", async (req, res) => {
  const productId =
    typeof req.body.productId === "string" ? req.body.productId : "";
  const userId = "U001";

  try {
    const userInfo = await Users.findOne({ userId });
    if (!userInfo) {
      res.json({ status: "1", msg: "用户不存在" });
      return;
    }

    const cartItem = userInfo.cartList.find(
      (item) => item.productId === productId,
    );
    if (cartItem) {
      cartItem.productNum += 1;
      await userInfo.save();
      res.json({ status: "0", msg: "", result: "suc" });
      return;
    }

    const good = await Goods.findOne({ productId });
    if (!good) {
      res.json({ status: "1", msg: "商品不存在" });
      return;
    }

    const newCartItem: CartItem = {
      productId: good.productId,
      productName: good.productName,
      salePrice: good.salePrice,
      ...(good.productImage === undefined
        ? {}
        : { productImage: good.productImage }),
      productNum: 1,
      checked: 1,
    };
    userInfo.cartList.push(newCartItem);
    await userInfo.save();
    res.json({ status: "0", msg: "", result: "suc" });
  } catch (error: unknown) {
    res.json({ status: "1", msg: getErrorMessage(error) });
  }
});

export default router;
function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "未知错误";
}
