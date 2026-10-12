import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { setupApi } from "./helpers/api";

const { request } = setupApi();

describe("GET /user/", () => {
  it("returns the user route response", async () => {
    const response = await request("/user/");
    assert.equal(response.status, 200);
    assert.deepEqual(response.body, { msg: "哈哈哈" });
  });

});
