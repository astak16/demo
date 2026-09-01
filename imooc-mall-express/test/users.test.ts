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
  const findUser = mock.method(Users, "findOne", async () => ({
    cartList: [],
  }));
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
  assert.deepEqual(findUser.mock.calls[0]!.arguments, [{ userId: "U001" }]);
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
  mock.method(Users, "findOne", async () => ({ cartList: [] }));
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
  mock.method(Users, "findOne", async () => ({ cartList: [] }));
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
  const findUser = mock.method(Users, "findOne", async () => ({
    cartList: [],
  }));
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
  assert.equal(findUser.mock.callCount(), 0);
  assert.equal(updateUser.mock.callCount(), 0);
});

test("POST /users/cardDel removes the matching cart item", async () => {
  const findUser = mock.method(Users, "findOne", async () => ({
    cartList: [{ productId: "P001" }],
  }));
  const updateUser = mock.method(Users, "updateOne", async () => ({
    matchedCount: 1,
    modifiedCount: 1,
  }));

  const response = await request(app)
    .post("/users/cardDel")
    .set("Cookie", "userId=U001")
    .send({ productId: "P001" });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "0",
    msg: "",
    result: "suc",
  });
  assert.deepEqual(findUser.mock.calls[0]!.arguments, [{ userId: "U001" }]);
  assert.deepEqual(updateUser.mock.calls[0]!.arguments, [
    { userId: "U001", "cartList.productId": "P001" },
    { $pull: { cartList: { productId: "P001" } } },
  ]);
});

test("POST /users/cardDel returns a business error when the cart item is not found", async () => {
  mock.method(Users, "findOne", async () => ({ cartList: [] }));
  mock.method(Users, "updateOne", async () => ({
    matchedCount: 0,
    modifiedCount: 0,
  }));

  const response = await request(app)
    .post("/users/cardDel")
    .set("Cookie", "userId=U001")
    .send({ productId: "missing" });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "1",
    msg: "商品不存在",
    result: "",
  });
});

test("POST /users/cardDel returns a business error when the update fails", async () => {
  mock.method(Users, "findOne", async () => ({ cartList: [] }));
  mock.method(Users, "updateOne", async () => {
    throw new Error("database unavailable");
  });

  const response = await request(app)
    .post("/users/cardDel")
    .set("Cookie", "userId=U001")
    .send({ productId: "P001" });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "1",
    msg: "database unavailable",
    result: "",
  });
});

test("POST /users/cardDel rejects a request without a login cookie", async () => {
  const findUser = mock.method(Users, "findOne", async () => ({
    cartList: [],
  }));
  const updateUser = mock.method(Users, "updateOne", async () => ({
    matchedCount: 1,
    modifiedCount: 1,
  }));

  const response = await request(app)
    .post("/users/cardDel")
    .send({ productId: "P001" });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "10001",
    msg: "当前未登录",
    result: "",
  });
  assert.equal(findUser.mock.callCount(), 0);
  assert.equal(updateUser.mock.callCount(), 0);
});

test("POST /users/editCheckAll checks every cart item", async () => {
  const cartList = [
    { productId: "P001", productNum: 1, checked: 0 },
    { productId: "P002", productNum: 2, checked: "0" },
  ];
  const user = { cartList, save: mock.fn(async () => {}) };
  mock.method(Users, "findOne", async () => user);

  const response = await request(app)
    .post("/users/editCheckAll")
    .set("Cookie", "userId=U001")
    .send({ checkAll: true });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "0",
    msg: "",
    result: "suc",
  });
  assert.deepEqual(
    cartList.map((item) => item.checked),
    ["1", "1"],
  );
  assert.equal(user.save.mock.callCount(), 1);
});

test("POST /users/editCheckAll unchecks every cart item", async () => {
  const cartList = [
    { productId: "P001", productNum: 1, checked: 1 },
    { productId: "P002", productNum: 2, checked: "1" },
  ];
  const user = { cartList, save: mock.fn(async () => {}) };
  mock.method(Users, "findOne", async () => user);

  const response = await request(app)
    .post("/users/editCheckAll")
    .set("Cookie", "userId=U001")
    .send({ checkAll: false });

  assert.deepEqual(response.body, {
    status: "0",
    msg: "",
    result: "suc",
  });
  assert.deepEqual(
    cartList.map((item) => item.checked),
    ["0", "0"],
  );
  assert.equal(user.save.mock.callCount(), 1);
});

test("POST /users/editCheckAll returns a business error when saving fails", async () => {
  const user = {
    cartList: [{ productId: "P001", productNum: 1, checked: 0 }],
    save: mock.fn(async () => {
      throw new Error("database unavailable");
    }),
  };
  mock.method(Users, "findOne", async () => user);

  const response = await request(app)
    .post("/users/editCheckAll")
    .set("Cookie", "userId=U001")
    .send({ checkAll: true });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "1",
    msg: "database unavailable",
    result: "",
  });
});

test("POST /users/editCheckAll rejects a request without a login cookie", async () => {
  const findUser = mock.method(Users, "findOne", async () => ({
    cartList: [],
    save: mock.fn(async () => {}),
  }));

  const response = await request(app)
    .post("/users/editCheckAll")
    .send({ checkAll: true });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "10001",
    msg: "当前未登录",
    result: "",
  });
  assert.equal(findUser.mock.callCount(), 0);
});

test("POST /users/addAddress adds a default address and clears the previous default", async () => {
  const existingAddress = {
    addressId: "A001",
    userName: "Alice",
    streetName: "Old Street",
    postCode: 100000,
    tel: 13800000000,
    isDefault: true,
  };
  const user = {
    addressList: [existingAddress],
    cartList: [],
    save: mock.fn(async () => {}),
  };
  mock.method(Users, "findOne", async () => user);

  const response = await request(app)
    .post("/users/addAddress")
    .set("Cookie", "userId=U001")
    .send({
      userName: "Alice",
      streetName: "New Street",
      postCode: 200000,
      tel: 13900000000,
      isDefault: "true",
    });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "0",
    msg: "",
    result: "suc",
  });
  assert.equal(existingAddress.isDefault, false);
  assert.equal(user.addressList.length, 2);
  assert.deepEqual(user.addressList[1], {
    addressId: user.addressList[1]!.addressId,
    userName: "Alice",
    streetName: "New Street",
    postCode: 200000,
    tel: 13900000000,
    isDefault: true,
  });
  assert.match(user.addressList[1]!.addressId!, /^\d+$/);
  assert.equal(user.save.mock.callCount(), 1);
});

test("POST /users/addAddress preserves the current default when adding a non-default address", async () => {
  const existingAddress = {
    addressId: "A001",
    isDefault: true,
  };
  const user = {
    addressList: [existingAddress],
    cartList: [],
    save: mock.fn(async () => {}),
  };
  mock.method(Users, "findOne", async () => user);

  const response = await request(app)
    .post("/users/addAddress")
    .set("Cookie", "userId=U001")
    .send({
      userName: "Bob",
      streetName: "Second Street",
      postCode: 300000,
      tel: 13700000000,
      isDefault: false,
    });

  assert.deepEqual(response.body, {
    status: "0",
    msg: "",
    result: "suc",
  });
  assert.equal(existingAddress.isDefault, true);
  assert.equal(user.addressList[1]!.isDefault, false);
  assert.equal(user.save.mock.callCount(), 1);
});

test("POST /users/addAddress returns a business error when saving fails", async () => {
  const user = {
    addressList: [],
    cartList: [],
    save: mock.fn(async () => {
      throw new Error("database unavailable");
    }),
  };
  mock.method(Users, "findOne", async () => user);

  const response = await request(app)
    .post("/users/addAddress")
    .set("Cookie", "userId=U001")
    .send({ userName: "Alice", streetName: "New Street" });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "1",
    msg: "database unavailable",
    result: "",
  });
});

test("POST /users/addAddress rejects a request without a login cookie", async () => {
  const findUser = mock.method(Users, "findOne", async () => ({
    addressList: [],
    cartList: [],
    save: mock.fn(async () => {}),
  }));

  const response = await request(app)
    .post("/users/addAddress")
    .send({ userName: "Alice", streetName: "New Street" });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "10001",
    msg: "当前未登录",
    result: "",
  });
  assert.equal(findUser.mock.callCount(), 0);
});

test("GET /users/addressList returns the logged-in user's addresses", async () => {
  const addressList = [
    { addressId: "A001", streetName: "First Street", isDefault: true },
  ];
  mock.method(Users, "findOne", async () => ({ addressList, cartList: [] }));

  const response = await request(app)
    .get("/users/addressList")
    .set("Cookie", "userId=U001");

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "0",
    result: addressList,
    msg: "",
  });
});

test("GET /users/addressList returns an empty address list", async () => {
  mock.method(Users, "findOne", async () => ({ addressList: [], cartList: [] }));

  const response = await request(app)
    .get("/users/addressList")
    .set("Cookie", "userId=U001");

  assert.deepEqual(response.body, { status: "0", result: [], msg: "" });
});

test("GET /users/addressList rejects a request without a login cookie", async () => {
  const findUser = mock.method(Users, "findOne", async () => ({
    addressList: [],
    cartList: [],
  }));

  const response = await request(app).get("/users/addressList");

  assert.deepEqual(response.body, {
    status: "10001",
    msg: "当前未登录",
    result: "",
  });
  assert.equal(findUser.mock.callCount(), 0);
});

test("POST /users/setDefault changes the default address", async () => {
  const addressList = [
    { addressId: "A001", isDefault: true },
    { addressId: "A002", isDefault: false },
  ];
  const user = { addressList, cartList: [], save: mock.fn(async () => {}) };
  mock.method(Users, "findOne", async () => user);

  const response = await request(app)
    .post("/users/setDefault")
    .set("Cookie", "userId=U001")
    .send({ addressId: "A002" });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, { status: "0", msg: "", result: "" });
  assert.deepEqual(
    addressList.map((address) => address.isDefault),
    [false, true],
  );
  assert.equal(user.save.mock.callCount(), 1);
});

test("POST /users/setDefault rejects a missing address id", async () => {
  const user = {
    addressList: [{ addressId: "A001", isDefault: true }],
    cartList: [],
    save: mock.fn(async () => {}),
  };
  mock.method(Users, "findOne", async () => user);

  const response = await request(app)
    .post("/users/setDefault")
    .set("Cookie", "userId=U001")
    .send({});

  assert.deepEqual(response.body, {
    status: "1003",
    msg: "addressId 不存在",
    result: "",
  });
  assert.equal(user.save.mock.callCount(), 0);
});

test("POST /users/setDefault preserves the current default for an unknown address", async () => {
  const addressList = [{ addressId: "A001", isDefault: true }];
  const user = { addressList, cartList: [], save: mock.fn(async () => {}) };
  mock.method(Users, "findOne", async () => user);

  const response = await request(app)
    .post("/users/setDefault")
    .set("Cookie", "userId=U001")
    .send({ addressId: "missing" });

  assert.deepEqual(response.body, {
    status: "1",
    msg: "地址不存在",
    result: "",
  });
  assert.equal(addressList[0]!.isDefault, true);
  assert.equal(user.save.mock.callCount(), 0);
});

test("POST /users/setDefault returns a business error when saving fails", async () => {
  const user = {
    addressList: [{ addressId: "A001", isDefault: false }],
    cartList: [],
    save: mock.fn(async () => {
      throw new Error("database unavailable");
    }),
  };
  mock.method(Users, "findOne", async () => user);

  const response = await request(app)
    .post("/users/setDefault")
    .set("Cookie", "userId=U001")
    .send({ addressId: "A001" });

  assert.equal(response.status, 200);
  assert.deepEqual(response.body, {
    status: "1",
    msg: "database unavailable",
    result: "",
  });
});

test("POST /users/setDefault rejects a request without a login cookie", async () => {
  const findUser = mock.method(Users, "findOne", async () => ({
    addressList: [],
    cartList: [],
    save: mock.fn(async () => {}),
  }));

  const response = await request(app)
    .post("/users/setDefault")
    .send({ addressId: "A001" });

  assert.deepEqual(response.body, {
    status: "10001",
    msg: "当前未登录",
    result: "",
  });
  assert.equal(findUser.mock.callCount(), 0);
});
