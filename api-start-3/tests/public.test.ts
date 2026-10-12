import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { setupApi } from "./helpers/api";

const { cache, savedExpirations, request } = setupApi();

describe("GET /public/getCaptcha", () => {
  it("returns a captcha and stores its code with a ten minute expiry", async () => {
    const response = await request("/public/getCaptcha");

    assert.equal(response.status, 200);
    assert.equal(response.body.code, 200);
    assert.match(response.body.data.sid, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    assert.equal(response.body.data.text.length, 4);
    assert.equal(cache.get(response.body.data.sid), response.body.data.text);
    assert.equal(savedExpirations.get(response.body.data.sid), 600);
  });

});
