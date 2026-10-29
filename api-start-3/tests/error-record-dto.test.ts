import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DeleteErrorSchema, ErrorSchema } from "../src/dto/errorRecord";

describe("error record query schema", () => {
  it("parses method and code as top-level query parameters", () => {
    const result = ErrorSchema.safeParse({
      method: "POST",
      code: "500",
      page: "2",
      limit: "10",
    });

    assert.equal(result.success, true);
    if (!result.success) return;
    assert.deepEqual(result.data, { method: "POST", code: "500", page: 2, limit: 10 });
  });

  it("uses pagination defaults when filters are omitted", () => {
    assert.deepEqual(ErrorSchema.parse({}), { page: 1, limit: 10 });
  });

  it("rejects empty method and code filters", () => {
    const result = ErrorSchema.safeParse({ method: "", code: "" });

    assert.equal(result.success, false);
    if (result.success) return;
    assert.deepEqual(result.error.issues.map((issue) => issue.path[0]), ["code", "method"]);
  });

  it("validates ObjectId values when deleting error records", () => {
    assert.equal(DeleteErrorSchema.safeParse({ _ids: ["507f1f77bcf86cd799439011"] }).success, true);
    assert.equal(DeleteErrorSchema.safeParse({ _ids: ["invalid-id"] }).success, false);
  });
});
