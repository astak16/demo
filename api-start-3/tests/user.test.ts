import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { setupApi } from "./helpers/api";

const { request } = setupApi();

describe("POST /user/basic", () => {
  it("requires authentication", async () => {
    const response = await request("/user/basic", {});
    assert.equal(response.status, 401);
    assert.deepEqual(response.body, { code: 401, msg: "未登录" });
  });

});
