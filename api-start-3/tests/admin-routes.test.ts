import assert from "node:assert/strict";
import { describe, it } from "node:test";
import RoleModel from "../src/model/role";
import UserModel from "../src/model/user";
import { getRolesNames, getRoutes } from "../src/controller/admin";

describe("admin route handlers", () => {
  it("returns only role names", async (t) => {
    const roles = [{ name: "内容管理员" }, { name: "审核员" }];
    const find = t.mock.method(RoleModel, "find", async () => roles);
    const ctx = {} as any;

    await getRolesNames(ctx);

    assert.deepEqual(ctx.body, { code: 200, data: roles });
    assert.deepEqual(find.mock.calls[0].arguments, [{}, { name: 1, _id: 0 }]);
  });

  it("returns an error when the route user does not exist", async (t) => {
    const originalFindById = UserModel.findById;
    t.after(() => { UserModel.findById = originalFindById; });
    (UserModel as any).findById = () => ({ select: async () => null });
    const originalFind = RoleModel.find;
    t.after(() => { RoleModel.find = originalFind; });
    (RoleModel as any).find = () => { throw new Error("Roles should not be queried for a missing user"); };
    const ctx = { state: { user: { _id: "missing-user" } } } as any;

    await getRoutes(ctx);

    assert.deepEqual(ctx.body, { code: 500, msg: "没有此用户" });
  });

  it("returns no routes when user roles and role menus are absent", async (t) => {
    const originalFindById = UserModel.findById;
    const originalFind = RoleModel.find;
    t.after(() => {
      UserModel.findById = originalFindById;
      RoleModel.find = originalFind;
    });
    let requestedUserId: unknown = "not-set";
    let roleQuery: unknown;
    (UserModel as any).findById = (userId: unknown) => {
      requestedUserId = userId;
      return { select: async () => ({ roles: undefined }) };
    };
    (RoleModel as any).find = (query: unknown) => {
      roleQuery = query;
      return { select: () => ({ populate: () => ({ lean: async () => [{ menu: undefined }] }) }) };
    };

    const ctx = { state: {} } as any;
    await getRoutes(ctx);

    assert.deepEqual(ctx.body, { code: 200, data: [] });
    assert.equal(requestedUserId, undefined);
    assert.deepEqual(roleQuery, { role: { $in: [] } });
  });

  it("loads role menus and returns deduplicated, sorted route data", async (t) => {
    const menuOne = {
      _id: "menu-1",
      title: "Second",
      path: "/second",
      type: "link",
      sort: 20,
      icon: "link",
      link: "https://example.com",
    };
    const menuTwo = {
      _id: "menu-2",
      title: "First",
      path: "/first",
      type: "menu",
      sort: 10,
      component: "FirstPage",
      children: [],
    };
    const roleRows = [{ menu: [menuOne, menuTwo] }, { menu: [menuOne] }];
    const originalFindById = UserModel.findById;
    const originalFind = RoleModel.find;
    t.after(() => {
      UserModel.findById = originalFindById;
      RoleModel.find = originalFind;
    });
    let requestedUserId: unknown;
    let roleQuery: unknown;
    (UserModel as any).findById = (userId: unknown) => {
      requestedUserId = userId;
      return { select: async () => ({ roles: ["admin", "editor"] }) };
    };
    (RoleModel as any).find = (query: unknown) => {
      roleQuery = query;
      return { select: () => ({ populate: () => ({ lean: async () => roleRows }) }) };
    };
    const ctx = { state: { user: { _id: "user-1" } } } as any;

    await getRoutes(ctx);

    assert.deepEqual(ctx.body, {
      code: 200,
      data: [
        {
          _id: "menu-2",
          path: "/first",
          meta: {
            title: "First",
            hideInBread: undefined,
            hideInMenu: undefined,
            notCache: undefined,
            icon: undefined,
          },
          component: "FirstPage",
          children: [],
        },
        {
          _id: "menu-1",
          path: "/second",
          meta: { title: "Second", icon: "link", href: "https://example.com" },
        },
      ],
    });
    assert.equal(requestedUserId, "user-1");
    assert.deepEqual(roleQuery, { role: { $in: ["admin", "editor"] } });
  });
});
