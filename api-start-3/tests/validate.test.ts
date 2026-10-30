import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { z } from "zod";
import { withValidate } from "../src/common/Validate";

describe("withValidate", () => {
  it("formats schema issues without a field path", async () => {
    const middleware = withValidate({ body: z.custom(() => false, { message: "invalid body" }) }, async () => {
      assert.fail("invalid input must not reach the handler");
    });
    const ctx = { request: { body: "invalid" }, query: {}, params: {}, body: undefined } as any;

    await middleware(ctx, async () => {});

    assert.deepEqual(ctx.body, { code: 400, msg: { _: ["invalid body"] } });
  });
});
