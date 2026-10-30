import assert from "node:assert/strict";
import { describe, it } from "node:test";
import mongoose from "mongoose";
import CommentModel from "../src/model/comment";
import { setMsg } from "../src/controller/comment";

describe("setMsg single-message coverage", () => {
  it("handles a matched single-message update", async (t) => {
    const uid = new mongoose.Types.ObjectId().toString();
    const commentId = new mongoose.Types.ObjectId().toString();
    const update = t.mock.method(CommentModel, "updateOne", async () => ({ matchedCount: 1 } as never));
    const ctx = {
      request: { body: { _id: commentId } },
      state: { user: { _id: uid } },
    } as unknown as Parameters<typeof setMsg>[0];

    await setMsg(ctx, async () => {});

    assert.deepEqual(update.mock.calls[0].arguments, [{ uid, _id: commentId }, { isRead: "1" }]);
    assert.deepEqual(ctx.body, { code: 200, data: { _id: commentId }, msg: "更新成功" });
  });

  it("handles an unmatched single-message update", async (t) => {
    const uid = new mongoose.Types.ObjectId().toString();
    const commentId = new mongoose.Types.ObjectId().toString();
    const update = t.mock.method(CommentModel, "updateOne", async () => ({ matchedCount: 0 } as never));
    const ctx = {
      request: { body: { _id: commentId } },
      state: { user: { _id: uid } },
    } as unknown as Parameters<typeof setMsg>[0];

    await setMsg(ctx, async () => {});

    assert.deepEqual(update.mock.calls[0].arguments, [{ uid, _id: commentId }, { isRead: "1" }]);
    assert.deepEqual(ctx.body, { code: 500, msg: "更新失败" });
  });

  it("marks all messages as read when the request has no ID", async (t) => {
    const uid = new mongoose.Types.ObjectId().toString();
    const update = t.mock.method(CommentModel, "updateMany", async () => ({ matchedCount: 1 } as never));
    const ctx = {
      request: { body: {} },
      state: { user: { _id: uid } },
    } as unknown as Parameters<typeof setMsg>[0];

    await setMsg(ctx, async () => {});

    assert.deepEqual(update.mock.calls[0].arguments, [{ uid }, { isRead: "1" }]);
    assert.deepEqual(ctx.body, { code: 200, data: { _id: undefined }, msg: "更新成功" });
  });

  it("reports when no messages were updated", async (t) => {
    const uid = new mongoose.Types.ObjectId().toString();
    t.mock.method(CommentModel, "updateMany", async () => ({ matchedCount: 0 } as never));
    const ctx = {
      request: { body: {} },
      state: { user: { _id: uid } },
    } as unknown as Parameters<typeof setMsg>[0];

    await setMsg(ctx, async () => {});

    assert.deepEqual(ctx.body, { code: 500, msg: "更新失败" });
  });
});
