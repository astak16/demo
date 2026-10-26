import assert from "node:assert/strict";
import { describe, it } from "node:test";
import mongoose from "mongoose";
import "../src/config/dbHelper";
import PostModel from "../src/model/post";
import PostHistory from "../src/model/postHistory";

describe("post model statics", () => {
  it("queries posts from the last week ordered by answer", (t) => {
    const calls: Record<string, any> = {};
    const query = {
      sort(value: unknown) {
        calls.sort = value;
        return this;
      },
      limit(value: number) {
        calls.limit = value;
        return this;
      },
    };
    t.mock.method(PostModel, "find", (filter: Record<string, any>, projection: Record<string, number>) => {
      calls.filter = filter;
      calls.projection = projection;
      return query as any;
    });

    const startedAt = Date.now();
    const result = PostModel.getTopWeek();
    const cutoff = calls.filter.created.$gte as Date;
    const expectedCutoff = startedAt - 7 * 24 * 60 * 60 * 1000;

    assert.equal(result, query);
    assert.ok(Math.abs(cutoff.getTime() - expectedCutoff) < 1000);
    assert.deepEqual(calls.projection, { answer: 1, title: 1 });
    assert.deepEqual(calls.sort, { answer: -1 });
    assert.equal(calls.limit, 15);
  });
});

describe("post history model statics", () => {
  it("upserts and returns the visit history for a user and post", async (t) => {
    const tid = new mongoose.Types.ObjectId();
    const uid = new mongoose.Types.ObjectId();
    const updatedHistory = { tid, uid };
    let call: unknown[] = [];
    t.mock.method(PostHistory, "findOneAndUpdate", async (...args: any[]) => {
      call = args;
      return updatedHistory as any;
    });

    const result = await PostHistory.addOrUpdateVisitHistory(tid, uid);

    assert.equal(result, updatedHistory);
    assert.deepEqual(call, [
      { tid, uid },
      {},
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ]);
  });
});

