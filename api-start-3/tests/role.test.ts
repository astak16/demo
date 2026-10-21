import assert from "node:assert/strict";
import { describe, it } from "node:test";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import { JWT_SECRET } from "../src/config";
import RoleModel from "../src/model/role";
import { setupApi } from "./helpers/api";

const { request } = setupApi();
const authHeader = { Authorization: `Bearer ${jwt.sign({ _id: "role-admin" }, JWT_SECRET)}` };
const roleId = new mongoose.Types.ObjectId().toString();
const validRole = {
  name: "内容管理员",
  role: "content-admin",
  desc: "管理内容",
  menu: ["posts", "comments"],
};

describe("admin roles", () => {
  it("requires authentication", async () => {
    const response = await request("/admin/getRoles");
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { code: 401, msg: "未登录" });
  });

  it("lists roles with the configured projection", async (t) => {
    const roles = [{ name: "内容管理员", role: "content-admin" }];
    const find = t.mock.method(RoleModel, "find", async () => roles);

    const response = await request("/admin/getRoles", undefined, authHeader);

    assert.deepEqual(response.body, { code: 200, data: roles });
    assert.deepEqual(find.mock.calls[0].arguments, [{}, { name: 1, role: 1, _id: 0 }]);
  });

  it("validates and creates a role", async (t) => {
    const create = t.mock.method(RoleModel, "create", async () => ({ _id: roleId }));
    const invalid = await request("/admin/addRole", { ...validRole, menu: "posts" }, authHeader);
    assert.equal(invalid.body.code, 400);
    assert.ok(invalid.body.msg.menu);
    assert.equal(create.mock.callCount(), 0);

    const emptyFields = await request("/admin/addRole", { name: "", role: "", desc: "", menu: [""] }, authHeader);
    assert.equal(emptyFields.body.code, 400);
    for (const field of ["name", "role", "desc", "menu"]) assert.ok(emptyFields.body.msg[field]);
    assert.equal(create.mock.callCount(), 0);

    const response = await request("/admin/addRole", validRole, authHeader);
    assert.deepEqual(response.body, { code: 200, data: roleId });
    assert.deepEqual(create.mock.calls[0].arguments, [validRole]);
  });

  it("updates a role and reports when it does not exist", async (t) => {
    const update = t.mock.method(RoleModel, "updateOne", async () => ({ matchedCount: 1 }));
    const invalid = await request("/admin/editRole", { _id: "bad-id", ...validRole }, authHeader);
    assert.equal(invalid.body.code, 400);
    assert.ok(invalid.body.msg._id);
    assert.equal(update.mock.callCount(), 0);

    const response = await request("/admin/editRole", { _id: roleId, ...validRole }, authHeader);

    assert.deepEqual(response.body, { code: 200, msg: "更新成功" });
    assert.deepEqual(update.mock.calls[0].arguments, [{ _id: roleId }, validRole]);

    update.mock.mockImplementation(async () => ({ matchedCount: 0 }));
    const missing = await request("/admin/editRole", { _id: roleId, ...validRole }, authHeader);
    assert.deepEqual(missing.body, { code: 500, msg: "更新失败" });
  });

  it("soft deletes roles and reports when no role matches", async (t) => {
    const update = t.mock.method(RoleModel, "updateMany", async () => ({ matchedCount: 2, modifiedCount: 2 }));
    const invalid = await request("/admin/deleteRole", { _ids: ["bad-id"] }, authHeader);
    assert.equal(invalid.body.code, 400);
    assert.ok(invalid.body.msg._ids);
    assert.equal(update.mock.callCount(), 0);

    const response = await request("/admin/deleteRole", { _ids: [roleId] }, authHeader);

    assert.deepEqual(response.body, { code: 200, msg: "删除成功", data: { modifiedCount: 2 } });
    assert.deepEqual(update.mock.calls[0].arguments, [
      { _id: { $in: [roleId] } },
      { $set: { isDeleted: 1 } },
    ]);

    update.mock.mockImplementation(async () => ({ matchedCount: 0, modifiedCount: 0 }));
    const missing = await request("/admin/deleteRole", { _ids: [roleId] }, authHeader);
    assert.deepEqual(missing.body, { code: 500, msg: "没有可删除的标签" });
  });
});
