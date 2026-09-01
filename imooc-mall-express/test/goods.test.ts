import assert from "node:assert/strict";
import { after, afterEach, mock, test } from "node:test";

import mongoose from "mongoose";
import request from "supertest";

import app from "../app";
import Goods from "../models/goods";
import Users from "../models/users";

const originalGoodsFind = Goods.find;
const originalGoodsFindOne = Goods.findOne;
const originalUsersFindOne = Users.findOne;

afterEach(() => {
  Goods.find = originalGoodsFind;
  Goods.findOne = originalGoodsFindOne;
  Users.findOne = originalUsersFindOne;
});

after(async () => {
  await mongoose.disconnect();
});

test("GET /goods/list applies sorting and pagination and returns the matching goods", async () => {
  const goods = [
    { productId: "P003", productName: "Keyboard", salePrice: 299 },
    { productId: "P004", productName: "Mouse", salePrice: 99 },
  ];
  const query = {
    sort: mock.fn(() => query),
    skip: mock.fn(() => query),
    limit: mock.fn(async () => goods),
  };
  mock.method(Goods, "find", () => query);

  const response = await request(app)
    .get("/goods/list")
    .query({ page: 2, pageSize: 2, sort: -1 });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "0",
    msg: "",
    result: { count: 2, list: goods },
  });
  assert.deepEqual(query.sort.mock.calls[0]!.arguments, [{ salePrice: -1 }]);
  assert.deepEqual(query.skip.mock.calls[0]!.arguments, [2]);
  assert.deepEqual(query.limit.mock.calls[0]!.arguments, [2]);
});

test("GET /goods/list returns a business error when the query fails", async () => {
  mock.method(Goods, "find", () => {
    throw new Error("database unavailable");
  });

  const response = await request(app).get("/goods/list");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "1",
    msg: "database unavailable",
  });
});

test("POST /goods/addCart rejects an unknown user", async () => {
  const findUser = mock.method(Users, "findOne", async () => null);

  const response = await request(app)
    .post("/goods/addCart")
    .send({ productId: "P001" });

  assert.deepEqual(response.body, { status: "1", msg: "用户不存在" });
  assert.deepEqual(findUser.mock.calls[0]!.arguments, [{ userId: "U001" }]);
});

test("POST /goods/addCart increments an existing cart item", async () => {
  const cartItem = { productId: "P001", productNum: 2 };
  const user = { cartList: [cartItem], save: mock.fn(async () => {}) };
  mock.method(Users, "findOne", async () => user);

  const response = await request(app)
    .post("/goods/addCart")
    .send({ productId: "P001" });

  assert.deepEqual(response.body, { status: "0", msg: "", result: "suc" });
  assert.equal(cartItem.productNum, 3);
  assert.equal(user.save.mock.callCount(), 1);
});

test("POST /goods/addCart adds a new product with cart defaults", async () => {
  const user = { cartList: [], save: mock.fn(async () => {}) };
  const good = {
    productId: "P002",
    productName: "Speaker",
    salePrice: 199,
  };
  mock.method(Users, "findOne", async () => user);
  const findGood = mock.method(Goods, "findOne", async () => good);

  const response = await request(app)
    .post("/goods/addCart")
    .send({ productId: "P002" });

  assert.deepEqual(response.body, { status: "0", msg: "", result: "suc" });
  assert.deepEqual(findGood.mock.calls[0]!.arguments, [
    { productId: "P002" },
  ]);
  assert.deepEqual(user.cartList, [
    {
      productId: "P002",
      productName: "Speaker",
      salePrice: 199,
      productNum: 1,
      checked: 1,
    },
  ]);
  assert.equal(user.save.mock.callCount(), 1);
});

test("POST /goods/addCart rejects an unknown product", async () => {
  const user = { cartList: [], save: mock.fn(async () => {}) };
  mock.method(Users, "findOne", async () => user);
  mock.method(Goods, "findOne", async () => null);

  const response = await request(app)
    .post("/goods/addCart")
    .send({ productId: "missing" });

  assert.deepEqual(response.body, { status: "1", msg: "商品不存在" });
  assert.equal(user.save.mock.callCount(), 0);
});

test("POST /goods/addCart returns a business error when persistence fails", async () => {
  mock.method(Users, "findOne", async () => {
    throw new Error("write failed");
  });

  const response = await request(app)
    .post("/goods/addCart")
    .send({ productId: "P001" });

  assert.deepEqual(response.body, { status: "1", msg: "write failed" });
});

test("GET an unknown route returns a 404 response", async () => {
  const response = await request(app).get("/unknown-route");

  assert.equal(response.status, 404);
  assert.equal(response.text, "Not Found");
});
