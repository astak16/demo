import assert from "node:assert/strict";
import { describe, it } from "node:test";
import CommentModel from "../src/model/comment";

describe("comment list query", () => {
  it("accepts an array search and returns the unpaged total", async (t) => {
    let pipeline: any[] = [];
    const result = { data: [{ content: "matching comment" }], total: 3 };
    t.mock.method(CommentModel, "aggregate", (stages: any[]) => {
      pipeline = stages;
      return Promise.resolve([result]) as any;
    });

    const response = await CommentModel.getCommentsOptions({ item: "tid", search: ["李四", "王五"] }, 2, 5);

    assert.deepEqual(response, result);
    assert.deepEqual(pipeline[2], { $match: { "post.title": /李四|王五/i } });
    assert.deepEqual(pipeline.at(-2).$facet.total, [{ $count: "count" }]);
    assert.deepEqual(pipeline.at(-2).$facet.data.slice(0, 3), [
      { $sort: { created: -1, _id: -1 } },
      { $skip: 5 },
      { $limit: 5 },
    ]);
  });

  it("uses the two search values as an exclusive date range and counts all matches", async (t) => {
    const calls: unknown[] = [];
    const rows = [{ content: "matching comment" }];
    const query: any = {
      populate(...args: unknown[]) {
        calls.push(["populate", ...args]);
        return this;
      },
      skip(value: number) {
        calls.push(["skip", value]);
        return this;
      },
      limit(value: number) {
        calls.push(["limit", value]);
        return this;
      },
      sort(value: unknown) {
        calls.push(["sort", value]);
        return Promise.resolve(rows);
      },
    };
    const find = t.mock.method(CommentModel, "find", (filter: unknown) => {
      calls.push(["find", filter]);
      return query;
    });
    const count = t.mock.method(CommentModel, "countDocuments", async (filter: unknown) => {
      calls.push(["count", filter]);
      return 8;
    });

    const response = await CommentModel.getCommentsOptions({ item: "created", search: ["2026-10-22", "2026-10-23"] }, 3, 5);

    assert.deepEqual(response, { data: rows, total: 8 });
    const filter = { created: { $gte: "2026-10-22", $lt: "2026-10-23" } };
    assert.deepEqual(find.mock.calls[0].arguments[0], filter);
    assert.deepEqual(count.mock.calls[0].arguments[0], filter);
    assert.deepEqual(
      calls.filter((call) => (call as any[])[0] === "populate").map((call) => (call as any[]).slice(1)),
      [
        [{ path: "tid", select: "_id title" }],
        [{ path: "cuid", select: "_id name" }],
        [{ path: "uid", select: "_id name" }],
      ],
    );
    assert.deepEqual(calls.filter((call) => ["skip", "limit", "sort"].includes((call as any[])[0])), [
      ["skip", 10],
      ["limit", 5],
      ["sort", { created: -1 }],
    ]);
  });

  it("filters each associated field and accepts a scalar search string", async (t) => {
    const pipelines: any[][] = [];
    t.mock.method(CommentModel, "aggregate", (stages: any[]) => {
      pipelines.push(stages);
      return Promise.resolve([{ data: [], total: 0 }]) as any;
    });

    await CommentModel.getCommentsOptions({ item: "uid", search: "Alice" }, 1, 10);
    await CommentModel.getCommentsOptions({ item: "cuid", search: ["Bob", "Carol"] }, 1, 10);

    assert.ok(pipelines[0].some((stage) => stage.$match?.["postAuthor.name"]?.source === "Alice"));
    assert.ok(pipelines[1].some((stage) => stage.$match?.["commentAuthor.name"]?.source === "Bob|Carol"));
  });

  it("escapes regular expression characters so they are searched literally", async (t) => {
    let pipeline: any[] = [];
    t.mock.method(CommentModel, "aggregate", (stages: any[]) => {
      pipeline = stages;
      return Promise.resolve([{ data: [], total: 0 }]) as any;
    });

    await CommentModel.getCommentsOptions({ item: "tid", search: "a+b.c" }, 1, 10);

    const titlePattern = pipeline.find((stage) => stage.$match?.["post.title"])?.$match["post.title"];
    assert.equal(titlePattern.test("a+b.c"), true);
    assert.equal(titlePattern.test("aaabxc"), false);
  });

  it("omits text matches when search contains only whitespace", async (t) => {
    let pipeline: any[] = [];
    t.mock.method(CommentModel, "aggregate", (stages: any[]) => {
      pipeline = stages;
      return Promise.resolve([]) as any;
    });

    const response = await CommentModel.getCommentsOptions({ item: "tid", search: ["  ", "\t"] }, 1, 10);

    assert.deepEqual(response, { data: [], total: 0 });
    assert.equal(pipeline.some((stage) => stage.$match?.["post.title"]), false);
  });

  it("returns an empty result for unsupported items or an incomplete date range", async () => {
    assert.deepEqual(await CommentModel.getCommentsOptions({ item: "unknown", search: "x" }, 1, 10), { data: [], total: 0 });
    assert.deepEqual(await CommentModel.getCommentsOptions({ item: "created", search: ["2026-10-22"] }, 1, 10), {
      data: [],
      total: 0,
    });
  });

  it("handles missing search options", async (t) => {
    t.mock.method(CommentModel, "aggregate", async () => [] as any);
    assert.deepEqual(await CommentModel.getCommentsOptions(undefined as any, 1, 10), { data: [], total: 0 });
    assert.deepEqual(await CommentModel.getCommentsOptions({ item: "tid" }, 1, 10), { data: [], total: 0 });
  });

  it("returns unread messages and their total", async (t) => {
    const rows = [{ _id: "comment-1", content: "A reply" }];
    const calls: unknown[][] = [];
    const query = {
      populate(value: unknown) { calls.push(["populate", value]); return this; },
      sort(value: unknown) { calls.push(["sort", value]); return this; },
      async exec() { return rows; },
    };
    const find = t.mock.method(CommentModel, "find", (filter: unknown) => {
      calls.push(["find", filter]);
      return query as never;
    });
    const count = t.mock.method(CommentModel, "countDocuments", async () => 4);

    const result = await CommentModel.getMyMsgs("user-1");

    assert.deepEqual(result, { list: rows, total: 4 });
    assert.deepEqual(find.mock.calls[0].arguments, [{
      uid: "user-1",
      cuid: { $ne: "user-1" },
      isRead: "0",
      status: "1",
    }]);
    assert.deepEqual(calls[1], ["populate", [
      { path: "tid", select: "_id title content" },
      { path: "uid", select: "_id name" },
      { path: "cuid", select: "_id name" },
    ]]);
    assert.deepEqual(calls[2], ["sort", { created: -1 }]);
    assert.deepEqual(count.mock.calls[0].arguments, [find.mock.calls[0].arguments[0]]);
  });
});
