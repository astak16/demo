import { AppContext } from "../../types/types";
import { withBody } from "../common/Validate";
import logger from "../config/logger";
import { AddCommentSchema } from "../dto/comment";
import CommentModel from "../model/comment";
import PostModel from "../model/post";
import UserModel from "../model/user";
import mongoose from "mongoose";

const canReply = async (ctx: AppContext) => {
  const _id = ctx.state.user!._id!;
  const user = await UserModel.findById(_id);
  if (user?.status === "0") {
    return true;
  } else {
    return false;
  }
};

export const addComment = withBody(AddCommentSchema, async (ctx, body) => {
  if (!(await canReply(ctx))) {
    ctx.body = { code: 500, msg: "用户已被禁言" };
    return;
  }
  const { tid } = body;
  const _id = ctx.state.user?._id!;
  const post = await PostModel.findById(tid);
  if (!post) {
    ctx.body = { code: 500, msg: "文章不存在" };
    return;
  }

  try {
    const comment = await CommentModel.create({ ...body, uid: post.uid, cuid: _id });
    try {
      await PostModel.updateOne({ _id: tid }, { $inc: { answer: 1 } });
    } catch (err) {
      await CommentModel.deleteOne({ _id: comment._id }); // 手动回滚
      throw err;
    }
    ctx.body = { code: 200, msg: "评论成功" };
  } catch (err) {
    logger.error({ err }, "评论失败");
    ctx.body = { code: 500, msg: "评论失败" };
  }
});
