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
      populate() {
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

    const response = await CommentModel.getCommentsOptions({ item: "created", search: ["2026-10-22", "2026-10-23"] }, 1, 5);

    assert.deepEqual(response, { data: rows, total: 8 });
    const filter = { created: { $gte: "2026-10-22", $lt: "2026-10-23" } };
    assert.deepEqual(find.mock.calls[0].arguments[0], filter);
    assert.deepEqual(count.mock.calls[0].arguments[0], filter);
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

  it("omits text matches when the normalized search list is empty", async (t) => {
    let pipeline: any[] = [];
    t.mock.method(CommentModel, "aggregate", (stages: any[]) => {
      pipeline = stages;
      return Promise.resolve([]) as any;
    });

    const response = await CommentModel.getCommentsOptions({ item: "tid", search: ["  ", 42] }, 1, 10);

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
});
