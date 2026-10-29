import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addError, deleteError, getErrorList } from "../src/controller/errorRecord";
import ErrorRecordModel from "../src/model/errorRecord";

const userId = "507f1f77bcf86cd799439011";
const errorId = "507f1f77bcf86cd799439012";
const validError = {
  message: "Request failed",
  code: "500",
  method: "POST",
  path: "/api/items",
  param: { itemId: 1 },
  stack: "Error: Request failed",
};

describe("error record handlers", () => {
  it("validates and creates an error record with the current user ID", async (t) => {
    const create = t.mock.method(ErrorRecordModel, "create", async (record: unknown) => ({ _id: errorId, record }));
    const invalidCtx = {
      request: { body: { ...validError, message: "" } },
      state: { user: { _id: userId } },
    } as any;

    await addError(invalidCtx, async () => {});

    assert.equal(invalidCtx.body.code, 400);
    assert.equal(create.mock.callCount(), 0);

    const ctx = { request: { body: validError }, state: { user: { _id: userId } } } as any;
    await addError(ctx, async () => {});

    assert.deepEqual(ctx.body, { code: 200, data: { _id: errorId }, msg: "添加成功" });
    assert.deepEqual(create.mock.calls[0].arguments, [{ ...validError, userId }]);
  });

  it("filters error records and returns filter options", async (t) => {
    const methodFilter = [{ _id: "POST" }];
    const codeFilter = [{ _id: "500" }];
    const list = [{ _id: errorId, message: "Request failed" }];
    let aggregateCalls = 0;
    t.mock.method(ErrorRecordModel, "aggregate", async () => {
      aggregateCalls += 1;
      return (aggregateCalls === 1 ? methodFilter : codeFilter) as never;
    });

    const calls: unknown[][] = [];
    const query = {
      sort(value: unknown) { calls.push(["sort", value]); return this; },
      skip(value: number) { calls.push(["skip", value]); return this; },
      limit(value: number) { calls.push(["limit", value]); return this; },
      async exec() { return list; },
    };
    const find = t.mock.method(ErrorRecordModel, "find", (filter: unknown) => {
      calls.push(["find", filter]);
      return query as never;
    });
    t.mock.method(ErrorRecordModel, "countDocuments", async () => 3);
    const ctx = { query: { method: "post", code: "500", page: "2", limit: "1" }, request: { body: {} } } as any;

    await getErrorList(ctx, async () => {});

    assert.deepEqual(ctx.body, { code: 200, data: { list, total: 3, methodFilter, codeFilter } });
    assert.deepEqual(find.mock.calls[0].arguments, [
      { method: { $regex: "post", $options: "i" }, code: "500" },
    ]);
    assert.deepEqual(calls.filter((call) => call[0] !== "find"), [
      ["sort", { created: -1, _id: -1 }],
      ["skip", 1],
      ["limit", 1],
    ]);
  });

  it("deletes error records and reports when none matched", async (t) => {
    const update = t.mock.method(ErrorRecordModel, "updateMany", async () => ({ modifiedCount: 1 }));
    const ctx = { request: { body: { _ids: [errorId] } } } as any;

    await deleteError(ctx, async () => {});

    assert.deepEqual(ctx.body, { code: 200, msg: "删除成功", data: { modifiedCount: 1 } });
    assert.deepEqual(update.mock.calls[0].arguments, [
      { _id: { $in: [errorId] } },
      { $set: { isDeleted: 1 } },
    ]);

    update.mock.mockImplementationOnce(async () => ({ modifiedCount: 0 }));
    const missingCtx = { request: { body: { _ids: [errorId] } } } as any;
    await deleteError(missingCtx, async () => {});
    assert.deepEqual(missingCtx.body, { code: 500, msg: "没有可删除的错误信息" });
  });
});
