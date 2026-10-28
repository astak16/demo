import assert from "node:assert/strict";
import { describe, it } from "node:test";
import dayjs from "dayjs";
import type { AppContext } from "../types/types";
import { getStats } from "../src/controller/user";
import CommentModel from "../src/model/comment";
import PostModel from "../src/model/post";
import UserModel from "../src/model/user";

describe("GET /admin/getstat", () => {
  it("returns typed summary, category, month, and weekly statistics", async (t) => {
    t.mock.method(UserModel, "find", () => ({ countDocuments: async () => 11 }) as never);

    let postFindCount = 0;
    t.mock.method(PostModel, "find", () => {
      postFindCount += 1;
      return { countDocuments: async () => (postFindCount === 1 ? 22 : 55) } as never;
    });

    let commentFindCount = 0;
    t.mock.method(CommentModel, "find", () => {
      commentFindCount += 1;
      return { countDocuments: async () => (commentFindCount === 1 ? 33 : 44) } as never;
    });

    const today = dayjs().format("YYYY-MM-DD");
    const twoDaysAgo = dayjs().subtract(2, "day").format("YYYY-MM-DD");
    let postAggregateCount = 0;
    t.mock.method(PostModel, "aggregate", () => {
      postAggregateCount += 1;
      const rows: unknown[] = postAggregateCount === 1
        ? [{ _id: "qna", count: 7 }, { _id: null, count: 3 }]
        : postAggregateCount === 2
          ? [{ _id: dayjs().format("YYYY-MM"), count: 6 }]
          : [{ _id: twoDaysAgo, count: 4 }];
      return Promise.resolve(rows) as never;
    });
    t.mock.method(UserModel, "aggregate", async () => [{ _id: today, count: 2 }] as never);
    t.mock.method(CommentModel, "aggregate", async () => [] as never);

    const ctx = {} as AppContext;
    await getStats(ctx);

    const data = (ctx.body as { data: {
      inforCardData: number[];
      pieData: Record<string, number>;
      monthData: Record<string, number>;
      weekData: { user: number[]; post: number[]; comments: number[] };
    } }).data;
    assert.deepEqual(data.inforCardData, [11, 22, 33, 44, 55]);
    assert.deepEqual(data.pieData, { qna: 7 });
    assert.deepEqual(data.monthData, { [dayjs().format("YYYY-MM")]: 6 });
    assert.deepEqual(data.weekData, {
      user: [0, 0, 0, 0, 0, 0, 2],
      post: [0, 0, 0, 0, 4, 0, 0],
      comments: [0, 0, 0, 0, 0, 0, 0],
    });
  });
});
