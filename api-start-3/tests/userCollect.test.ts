import assert from "node:assert/strict";
import { describe, it } from "node:test";
import UserCollectModel from "../src/model/userCollect";

describe("UserCollect query helpers", () => {
  it("filters collections by user ID", () => {
    const uid = "user-123";
    const query = UserCollectModel.find().byUid(uid);

    assert.deepEqual(query.getFilter(), { uid });
  });
});
