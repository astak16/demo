import assert from "node:assert/strict";
import { after, afterEach, mock, test } from "node:test";

import mongoose from "mongoose";
import request from "supertest";

import app from "../app";
import Users from "../models/users";

const originalUsersFindOne = Users.findOne;
const originalUsersUpdateOne = Users.updateOne;

afterEach(() => {
  Users.findOne = originalUsersFindOne;
  Users.updateOne = originalUsersUpdateOne;
});

after(async () => {
  await mongoose.disconnect();
});

test("POST /users/login returns the user and sets login cookies for valid credentials", async () => {
  const findUser = mock.method(Users, "findOne", async () => ({
    userId: "U001",
    userName: "alice",
  }));

  const response = await request(app)
    .post("/users/login")
    .send({ userName: "alice", userPwd: "secret" });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "0",
    result: { userName: "alice" },
    msg: "",
  });
  assert.deepEqual(findUser.mock.calls[0]!.arguments, [
    { userName: "alice", userPwd: "secret" },
  ]);

  const cookies = response.headers["set-cookie"] as unknown as string[];
  assert.ok(cookies.some((cookie) => cookie.startsWith("userId=U001;")));
  assert.ok(cookies.some((cookie) => cookie.startsWith("userName=alice;")));
  assert.ok(cookies.every((cookie) => cookie.includes("Path=/")));
  assert.ok(cookies.every((cookie) => cookie.includes("Max-Age=3600")));
});

test("POST /users/login returns a business error for invalid credentials", async () => {
  mock.method(Users, "findOne", async () => null);

  const response = await request(app)
    .post("/users/login")
    .send({ userName: "alice", userPwd: "wrong" });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "1",
    msg: "账号密码错误",
    result: "",
  });
  assert.equal(response.headers["set-cookie"], undefined);
});

test("POST /users/login returns a business error when the user query fails", async () => {
  mock.method(Users, "findOne", async () => {
    throw new Error("database unavailable");
  });

  const response = await request(app)
    .post("/users/login")
    .send({ userName: "alice", userPwd: "secret" });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "1",
    msg: "database unavailable",
    result: "",
  });
  assert.equal(response.headers["set-cookie"], undefined);
});

test("POST /users/logout clears login cookies and returns success", async () => {
  const response = await request(app)
    .post("/users/logout")
    .set("Cookie", ["userId=U001", "userName=alice"]);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "0",
    msg: "",
    result: "",
  });

  const cookies = response.headers["set-cookie"] as unknown as string[];
  assert.ok(cookies.some((cookie) => cookie.startsWith("userId=;")));
  assert.ok(cookies.some((cookie) => cookie.startsWith("userName=;")));
  assert.ok(cookies.every((cookie) => cookie.includes("Path=/")));
  assert.ok(cookies.every((cookie) => cookie.includes("Max-Age=-1")));
});

test("GET /users/checkLogin returns the user name when login cookies are present", async () => {
  const response = await request(app)
    .get("/users/checkLogin")
    .set("Cookie", ["userId=U001", "userName=alice"]);

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "0",
    msg: "",
    result: "alice",
  });
});

test("GET /users/checkLogin returns a business error without login cookies", async () => {
  const response = await request(app).get("/users/checkLogin");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "10001",
    msg: "当前未登录",
    result: "",
  });
});

test("GET /users/getCartCount returns the total quantity for the logged-in user", async () => {
  const findUser = mock.method(Users, "findOne", async () => ({
    cartList: [
      { productId: "P001", productNum: 2 },
      { productId: "P002", productNum: 3 },
    ],
  }));

  const response = await request(app)
    .get("/users/getCartCount")
    .set("Cookie", "userId=U001");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "0",
    result: 5,
    msg: "",
  });
  assert.deepEqual(findUser.mock.calls[0]!.arguments, [{ userId: "U001" }]);
});

test("GET /users/getCartCount returns zero for an empty cart", async () => {
  mock.method(Users, "findOne", async () => ({ cartList: [] }));

  const response = await request(app)
    .get("/users/getCartCount")
    .set("Cookie", "userId=U001");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "0",
    result: 0,
    msg: "",
  });
});

test("GET /users/getCartCount returns a business error for an unknown user", async () => {
  mock.method(Users, "findOne", async () => null);

  const response = await request(app)
    .get("/users/getCartCount")
    .set("Cookie", "userId=missing");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "1",
    msg: "未查到用户信息",
    result: "",
  });
});

test("GET /users/getCartCount returns a business error when the user query fails", async () => {
  mock.method(Users, "findOne", async () => {
    throw new Error("database unavailable");
  });

  const response = await request(app)
    .get("/users/getCartCount")
    .set("Cookie", "userId=U001");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "1",
    msg: "database unavailable",
    result: "",
  });
});

test("GET /users/getCartCount returns a business error without a login cookie", async () => {
  const response = await request(app)
    .get("/users/getCartCount")
    .timeout({ response: 200 });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "10001",
    msg: "当前未登录",
    result: "",
  });
});

test("GET /users/cartList returns the logged-in user's cart", async () => {
  const cartList = [
    {
      productId: "P001",
      productName: "Keyboard",
      salePrice: 299,
      productNum: 2,
      checked: 1,
    },
  ];
  const findUser = mock.method(Users, "findOne", async () => ({ cartList }));

  const response = await request(app)
    .get("/users/cartList")
    .set("Cookie", "userId=U001");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "0",
    msg: "",
    result: cartList,
  });
  assert.deepEqual(findUser.mock.calls[0]!.arguments, [{ userId: "U001" }]);
});

test("GET /users/cartList returns an empty list for an empty cart", async () => {
  mock.method(Users, "findOne", async () => ({ cartList: [] }));

  const response = await request(app)
    .get("/users/cartList")
    .set("Cookie", "userId=U001");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "0",
    msg: "",
    result: [],
  });
});

test("GET /users/cartList returns a business error for an unknown user", async () => {
  mock.method(Users, "findOne", async () => null);

  const response = await request(app)
    .get("/users/cartList")
    .set("Cookie", "userId=missing");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "1",
    msg: "未查到用户信息",
    result: "",
  });
});

test("GET /users/cartList returns a business error when the user query fails", async () => {
  mock.method(Users, "findOne", async () => {
    throw new Error("database unavailable");
  });

  const response = await request(app)
    .get("/users/cartList")
    .set("Cookie", "userId=U001");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "1",
    msg: "database unavailable",
    result: "",
  });
});

test("GET /users/cartList rejects a request without a login cookie", async () => {
  const findUser = mock.method(Users, "findOne", async () => ({
    cartList: [],
  }));

  const response = await request(app).get("/users/cartList");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "10001",
    msg: "当前未登录",
    result: "",
  });
  assert.equal(findUser.mock.callCount(), 0);
});

test("POST /users/cardEdit updates the matching cart item", async () => {
  const updateUser = mock.method(Users, "updateOne", async () => ({
    matchedCount: 1,
    modifiedCount: 1,
  }));

  const response = await request(app)
    .post("/users/cardEdit")
    .set("Cookie", "userId=U001")
    .send({ productId: "P001", productNum: 3, checked: 0 });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "0",
    msg: "",
    result: "suc",
  });
  assert.deepEqual(updateUser.mock.calls[0]!.arguments, [
    { userId: "U001", "cartList.productId": "P001" },
    {
      $set: {
        "cartList.$.productNum": 3,
        "cartList.$.checked": 0,
      },
    },
  ]);
});

test("POST /users/cardEdit returns a business error when the cart item is not found", async () => {
  mock.method(Users, "updateOne", async () => ({
    matchedCount: 0,
    modifiedCount: 0,
  }));

  const response = await request(app)
    .post("/users/cardEdit")
    .set("Cookie", "userId=U001")
    .send({ productId: "missing", productNum: 1, checked: 1 });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "1",
    msg: "用户或购物车商品不存在",
    result: "",
  });
});

test("POST /users/cardEdit returns a business error when the update fails", async () => {
  mock.method(Users, "updateOne", async () => {
    throw new Error("database unavailable");
  });

  const response = await request(app)
    .post("/users/cardEdit")
    .set("Cookie", "userId=U001")
    .send({ productId: "P001", productNum: 3, checked: 0 });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "1",
    msg: "database unavailable",
    result: "",
  });
});

test("POST /users/cardEdit rejects a request without a login cookie", async () => {
  const updateUser = mock.method(Users, "updateOne", async () => ({
    matchedCount: 1,
    modifiedCount: 1,
  }));

  const response = await request(app)
    .post("/users/cardEdit")
    .send({ productId: "P001", productNum: 3, checked: 0 });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "10001",
    msg: "当前未登录",
    result: "",
  });
  assert.equal(updateUser.mock.callCount(), 0);
});
