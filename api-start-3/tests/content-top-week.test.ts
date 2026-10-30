import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AppContext } from "../types/types";
import { getTopWeek } from "../src/controller/content";
import PostModel from "../src/model/post";

describe("getTopWeek controller", () => {
  it("returns the weekly ranking from the post model", async (t) => {
    const posts = [{ _id: "post-2", title: "Direct handler post", answer: 8 }];
    const lookup = t.mock.method(PostModel, "getTopWeek", async () => posts);
    const ctx = {} as AppContext;

    await getTopWeek(ctx);

    assert.deepEqual(ctx.body, { code: 200, data: posts });
    assert.equal(lookup.mock.callCount(), 1);
  });
});
