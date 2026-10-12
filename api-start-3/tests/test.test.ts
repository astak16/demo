import assert from "node:assert/strict";
import { describe, it } from "node:test";
import TestModel from "../src/model/test";
import { setupApi } from "./helpers/api";

const { request } = setupApi();

describe("GET /test/", () => {
  it("returns records from the test collection", async (t) => {
    t.mock.method(TestModel, "find", async () => [{ name: "sample", value: "42" }]);
    const response = await request("/test/");
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, [{ name: "sample", value: "42" }]);
  });
});
