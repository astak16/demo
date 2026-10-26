import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AddUserSchema,
  ChangePasswordSchema,
  DeleteUserSchema,
  EditUserSchema,
  UpdateBasicInfoSchema,
  UpdateUsernameSchema,
  UserAllSchema,
} from "../src/dto/user";

const userId = "507f1f77bcf86cd799439011";

describe("user DTO schemas", () => {
  it("validates optional basic profile fields", () => {
    assert.deepEqual(UpdateBasicInfoSchema.safeParse({ name: "Alice", location: "Shanghai" }).success, true);
    assert.equal(UpdateBasicInfoSchema.safeParse({ name: "" }).success, false);
    assert.equal(UpdateBasicInfoSchema.safeParse({ unknownField: true }).success, true);
  });

  it("requires nonempty old and new passwords", () => {
    assert.equal(ChangePasswordSchema.safeParse({ oldpwd: "old", newpwd: "new" }).success, true);
    assert.equal(ChangePasswordSchema.safeParse({ oldpwd: "", newpwd: "new" }).success, false);
    assert.equal(ChangePasswordSchema.safeParse({ oldpwd: "old" }).success, false);
  });

  it("validates confirmation token and username", () => {
    assert.equal(UpdateUsernameSchema.safeParse({ key: "token", username: "alice@example.com" }).success, true);
    assert.equal(UpdateUsernameSchema.safeParse({ key: "", username: "alice@example.com" }).success, false);
  });

  it("applies pagination defaults and validates supported user filters", () => {
    assert.deepEqual(UserAllSchema.parse({}), { page: 1, limit: 10 });
    assert.equal(UserAllSchema.safeParse({ item: "created", search: ["2026-10-01", "2026-10-31"] }).success, true);
    assert.equal(UserAllSchema.safeParse({ search: ["2026-10-01"] }).success, false);
    assert.equal(UserAllSchema.safeParse({ page: 0 }).success, false);
  });

  it("validates user IDs for delete and edit requests", () => {
    assert.equal(DeleteUserSchema.safeParse({ _ids: [userId] }).success, true);
    assert.equal(DeleteUserSchema.safeParse({ _ids: ["invalid-id"] }).success, false);
    assert.equal(EditUserSchema.safeParse({ _id: userId, name: "Alice" }).success, true);
    assert.equal(EditUserSchema.safeParse({ _id: "invalid-id", name: "Alice" }).success, false);
  });

  it("validates optional fields when adding a user", () => {
    assert.equal(AddUserSchema.safeParse({ username: "alice@example.com", roles: ["admin"], favs: 10 }).success, true);
    assert.equal(AddUserSchema.safeParse({ roles: [""] }).success, false);
    assert.equal(AddUserSchema.safeParse({ favs: 0 }).success, false);
  });
});
