import { AppContext } from "../../types/types";
import { withBody } from "../common/Validate";
import logger from "../config/logger";
import { AddCommentSchema, EditCommentSchema, SetBestSchema } from "../dto/comment";
import CommentModel from "../model/comment";
import PostModel from "../model/post";
import UserModel from "../model/user";

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
      ctx.body = { code: 200, data: { _id: comment._id }, msg: "评论成功" };
    } catch (err) {
      await CommentModel.deleteOne({ _id: comment._id }); // 手动回滚
      throw err;
    }
  } catch (err) {
    logger.error({ err }, "评论失败");
    ctx.body = { code: 500, msg: "评论失败" };
  }
});

export const updateComment = withBody(EditCommentSchema, async (ctx, body) => {
  const { _id } = body;
  if (!(await canReply(ctx))) {
    ctx.body = { code: 500, msg: "用户已被禁言" };
    return;
  }
  const result = await CommentModel.updateOne({ _id }, { $set: body });
  if (result.matchedCount) {
    ctx.body = { code: 200, data: { _id }, msg: "更新成功" };
  } else {
    ctx.body = { code: 500, msg: "更新失败" };
  }
});

export const setBest = withBody(SetBestSchema, async (ctx, body) => {
  const { tid, _id } = body;
  const userId = ctx.state.user!._id;
  const post = await PostModel.findById(tid);
  if (!post) {
    ctx.body = { code: 500, msg: "文章不存在" };
    return;
  }

  if (post.uid?.toString() !== userId) {
    ctx.body = { code: 500, msg: "非本人无法设置" };
    return;
  }

  if (post.isEnd !== "0") {
    ctx.body = { code: 500, msg: "文章已经结贴，无法重新设置" };
    return;
  }

  try {
    const comment = await CommentModel.findOneAndUpdate({ _id, tid, isBest: { $ne: "1" } }, { $set: { isBest: "1" } }, { new: true });
    if (!comment) {
      ctx.body = { code: 500, msg: "评论不存在、不属于该文章或已被采纳" };
      return;
    }

    const closePost = await PostModel.updateOne({ _id: tid, uid: userId, isEnd: "0" }, { $set: { isEnd: "1" } });
    if (!closePost.matchedCount) {
      await CommentModel.updateOne({ _id, tid }, { $set: { isBest: "0" } });
      ctx.body = { code: 500, msg: "文章已经结贴，无法重新设置" };
      return;
    }

    try {
      const award = await UserModel.updateOne({ _id: comment.cuid }, { $inc: { favs: post.fav ?? 0 } });
      if (!award.matchedCount) throw new Error("评论用户不存在，无法发放积分");

      ctx.body = { code: 200, data: { _id }, msg: "采纳成功" };
    } catch (err) {
      await Promise.allSettled([
        CommentModel.updateOne({ _id, tid }, { $set: { isBest: "0" } }),
        PostModel.updateOne({ _id: tid, isEnd: "1" }, { $set: { isEnd: "0" } }),
      ]);
      throw err;
    }
  } catch (err) {
    logger.error({ err }, "采纳评论失败");
    ctx.body = { code: 500, msg: "采纳失败" };
  }
});
