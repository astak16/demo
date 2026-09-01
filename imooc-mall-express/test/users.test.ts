import assert from "node:assert/strict";
import { after, afterEach, mock, test } from "node:test";

import mongoose from "mongoose";
import request from "supertest";

import app from "../app";
import Users from "../models/users";

const originalUsersFindOne = Users.findOne;

afterEach(() => {
  Users.findOne = originalUsersFindOne;
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
