import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AddMenuSchema, EditMenuSchema } from "../src/dto/menu";
import MenuModel from "../src/model/menu";
import { addMenu, deleteMenu, getMenus, updateMenu } from "../src/controller/admin";

const menuId = "507f1f77bcf86cd799439011";
const menuBody = { title: "Users", name: "users", path: "/users", sort: 10 };

describe("menu sort type", () => {
  it("uses a numeric sort field in the Mongoose schema", () => {
    assert.equal(MenuModel.schema.path("sort").instance, "Number");
  });

  it("accepts numeric sort values and rejects strings in menu DTOs", () => {
    const menu = {
      title: "Users",
      name: "users",
      path: "/users",
      sort: 10,
      children: [{ title: "List", name: "user-list", path: "/users/list", sort: 1 }],
    };

    assert.equal(AddMenuSchema.safeParse(menu).success, true);
    assert.equal(AddMenuSchema.safeParse({ ...menu, sort: "10" }).success, false);
    assert.equal(EditMenuSchema.safeParse({ _id: "507f1f77bcf86cd799439011", sort: 10 }).success, true);
    assert.equal(EditMenuSchema.safeParse({ _id: "507f1f77bcf86cd799439011", sort: "10" }).success, false);
  });

  it("keeps numeric sort values when validating menu documents", async () => {
    const menu = new MenuModel({ title: "Users", name: "users", path: "/users", sort: 10 });

    await menu.validate();

    assert.equal(menu.sort, 10);
    assert.equal(typeof menu.sort, "number");
  });
});

describe("admin menu handlers", () => {
  it("returns the menu list", async (t) => {
    const menus = [{ ...menuBody, _id: menuId }];
    const find = t.mock.method(MenuModel, "find", async () => menus);
    const ctx = {} as any;

    await getMenus(ctx);

    assert.deepEqual(ctx.body, { code: 200, data: menus });
    assert.deepEqual(find.mock.calls[0].arguments, []);
  });

  it("validates and creates a menu with a numeric sort value", async (t) => {
    const create = t.mock.method(MenuModel, "create", async (menu: unknown) => menu);
    const invalidCtx = { request: { body: { ...menuBody, sort: "10" } } } as any;

    await addMenu(invalidCtx, async () => {});

    assert.equal(invalidCtx.body.code, 400);
    assert.equal(create.mock.callCount(), 0);

    const ctx = { request: { body: menuBody } } as any;
    await addMenu(ctx, async () => {});

    assert.deepEqual(ctx.body, { code: 200, data: menuBody });
    assert.deepEqual(create.mock.calls[0].arguments, [menuBody]);
  });

  it("updates an existing menu", async (t) => {
    const update = t.mock.method(MenuModel, "updateOne", async () => ({ matchedCount: 1 }));
    const ctx = { request: { body: { _id: menuId, sort: 20 } } } as any;

    await updateMenu(ctx, async () => {});

    assert.deepEqual(ctx.body, { code: 200, msg: "更新成功" });
    assert.deepEqual(update.mock.calls[0].arguments, [{ _id: menuId }, { sort: 20 }]);
  });

  it("reports when a menu update matches no document", async (t) => {
    t.mock.method(MenuModel, "updateOne", async () => ({ matchedCount: 0 }));
    const ctx = { request: { body: { _id: menuId, sort: 20 } } } as any;

    await updateMenu(ctx, async () => {});

    assert.deepEqual(ctx.body, { code: 500, msg: "更新失败" });
  });

  it("soft deletes an existing menu", async (t) => {
    const update = t.mock.method(MenuModel, "updateOne", async () => ({ matchedCount: 1 }));
    const ctx = { request: { body: { _id: menuId } } } as any;

    await deleteMenu(ctx, async () => {});

    assert.deepEqual(ctx.body, { code: 200, msg: "删除成功" });
    assert.deepEqual(update.mock.calls[0].arguments, [{ _id: menuId }, { $set: { isDeleted: 1 } }]);
  });

  it("reports when a menu delete matches no document", async (t) => {
    t.mock.method(MenuModel, "updateOne", async () => ({ matchedCount: 0 }));
    const ctx = { request: { body: { _id: menuId } } } as any;

    await deleteMenu(ctx, async () => {});

    assert.deepEqual(ctx.body, { code: 500, msg: "删除失败" });
  });
});
