import assert from "node:assert/strict";
import { describe, it } from "node:test";
import mongoose, { Schema } from "mongoose";
import "../src/config/dbHelper";

describe("baseFields soft deletion filter", () => {
  const Model = mongoose.model(`SoftDeleteFilter_${Date.now()}`, new Schema({ name: String }));

  it("filters ordinary reads and counts", async (t) => {
    const filters: Record<string, unknown>[] = [];
    const collection = Model.collection as any;
    t.mock.method(collection, "find", (filter: Record<string, unknown>) => {
      filters.push(filter);
      return { toArray: async () => [] };
    });
    t.mock.method(collection, "findOne", async (filter: Record<string, unknown>) => {
      filters.push(filter);
      return null;
    });
    t.mock.method(collection, "countDocuments", async (filter: Record<string, unknown>) => {
      filters.push(filter);
      return 0;
    });

    await Model.find({ name: "keep" });
    await Model.findOne({ isDeleted: 1 });
    await Model.countDocuments({ name: "keep" });

    assert.deepEqual(filters, [
      { name: "keep", isDeleted: 0 },
      { isDeleted: 0 },
      { name: "keep", isDeleted: 0 },
    ]);
  });

  it("restricts updates while allowing a soft delete of an active record", async (t) => {
    const calls: Array<[Record<string, unknown>, Record<string, any>]> = [];
    const collection = Model.collection as any;
    const result = { acknowledged: true, matchedCount: 1, modifiedCount: 1 };
    t.mock.method(collection, "updateOne", async (filter: Record<string, unknown>, update: Record<string, any>) => {
      calls.push([filter, update]);
      return result;
    });
    t.mock.method(collection, "updateMany", async (filter: Record<string, unknown>, update: Record<string, any>) => {
      calls.push([filter, update]);
      return result;
    });

    await Model.updateOne({ name: "keep" }, { $set: { name: "changed" } });
    await Model.updateMany({ name: "keep" }, { $set: { isDeleted: 1 } });

    assert.deepEqual(calls.map(([filter]) => filter), [
      { name: "keep", isDeleted: 0 },
      { name: "keep", isDeleted: 0 },
    ]);
    assert.equal(calls[1][1].$set.isDeleted, 1);
  });
});
