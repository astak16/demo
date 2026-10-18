import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Model } from "mongoose";
import { paginate } from "../src/common/paginate";

describe("paginate", () => {
  it("applies defaults and returns the first page", async () => {
    const calls: Record<string, unknown> = {};
    const list = [{ _id: "item-1" }];
    const query = {
      sort(value: unknown) { calls.sort = value; return this; },
      skip(value: number) { calls.skip = value; return this; },
      limit(value: number) { calls.limit = value; return this; },
      async lean() { return list; },
    };
    const model = {
      find(filter: unknown) { calls.find = filter; return query; },
      async countDocuments(filter: unknown) { calls.count = filter; return 11; },
    } as unknown as Model<{ _id: string }>;

    assert.deepEqual(await paginate(model), { list, total: 11, page: 0, limit: 10, hasMore: true });
    assert.deepEqual(calls, {
      find: {}, count: {}, sort: { created: -1, _id: -1 }, skip: 0, limit: 10,
    });
  });

  it("clamps page size and applies select, multiple populations, and query options", async () => {
    const calls: Record<string, unknown> = { populate: [] };
    const filter = { status: "0" };
    const populate = [{ path: "owner", select: "name" }, { path: "category", select: "label" }];
    const queryOptions = { maxTimeMS: 1000 };
    const query = {
      sort(value: unknown) { calls.sort = value; return this; },
      skip(value: number) { calls.skip = value; return this; },
      limit(value: number) { calls.limit = value; return this; },
      select(value: string) { calls.select = value; return this; },
      populate(value: unknown) { (calls.populate as unknown[]).push(value); return this; },
      setOptions(value: unknown) { calls.options = value; return this; },
      async lean() { return []; },
    };
    const model = {
      find(value: unknown) { calls.find = value; return query; },
      async countDocuments(value: unknown) { calls.count = value; return 201; },
    } as unknown as Model<{ status: string }>;

    assert.deepEqual(await paginate(model, filter, {
      page: 2.9, limit: 200, sort: { created: 1, _id: 1 }, select: "title",
      populate, queryOptions,
    }), { list: [], total: 201, page: 2, limit: 100, hasMore: false });
    assert.deepEqual(calls, {
      find: filter, count: filter, sort: { created: 1, _id: 1 }, skip: 200, limit: 100,
      select: "title", populate, options: queryOptions,
    });
  });

  it("accepts one population and clamps negative or fractional inputs", async () => {
    const calls: Record<string, unknown> = {};
    const population = { path: "category" };
    const query = {
      sort(value: unknown) { calls.sort = value; return this; },
      skip(value: number) { calls.skip = value; return this; },
      limit(value: number) { calls.limit = value; return this; },
      populate(value: unknown) { calls.populate = value; return this; },
      async lean() { return []; },
    };
    const model = {
      find() { return query; },
      async countDocuments() { return 0; },
    } as unknown as Model<{ _id: string }>;

    assert.deepEqual(await paginate(model, {}, {
      page: -3, limit: 0.5, populate: population,
    }), { list: [], total: 0, page: 0, limit: 1, hasMore: false });
    assert.equal(calls.populate, population);
    assert.equal(calls.skip, 0);
    assert.equal(calls.limit, 1);
  });
});
