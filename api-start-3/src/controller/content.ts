import { checkCode } from "../common/Utils";
import { withBody } from "../common/Validate";
import { AddPostSchema, EditAllPostSchema, EditPostSchema } from "../dto/post";
import PostModel from "../model/post";
import UserModel from "../model/user";
import z from "zod";

export const addPost = withBody(AddPostSchema, async (ctx, body) => {
  const { sid, code, fav, ...rest } = body;
  const uid = ctx.state.user?._id!;
  if (!(await checkCode(sid, code))) {
    ctx.body = {
      code: 500,
      msg: "验证码错误，发布文章失败",
    };
    return;
  }

  if (fav > 0) {
    const r = await UserModel.updateOne({ _id: uid, favs: { $gte: fav } }, { $inc: { favs: -fav } });
    if (r.matchedCount !== 1) {
      ctx.body = { code: 400, msg: "积分不足，发布失败" };
      return;
    }
  }

  try {
    const post = await PostModel.create({ ...rest, fav, uid });
    ctx.body = { code: 200, data: { _id: post._id }, msg: "文章发布成功" };
  } catch (e) {
    if (fav > 0) await UserModel.updateOne({ _id: uid }, { $inc: { favs: fav } });
    throw e;
  }
});

type EditBody = z.infer<typeof EditAllPostSchema>;
const createEditPost = <S extends typeof EditPostSchema | typeof EditAllPostSchema>(schema: S) =>
  withBody(schema, async (ctx, body) => {
    const { sid, code, _id, ...fields } = body as EditBody;
    const uid = ctx.state.user!._id!;

    if (!(await checkCode(sid, code))) {
      ctx.body = { code: 500, msg: "验证码错误，修改文章失败" };
      return;
    }

    const post = await PostModel.findById(_id).select("uid isEnd").lean();
    if (!post) {
      ctx.body = { code: 500, msg: "文章不存在" };
      return;
    }
    if (post.uid?.toString() !== uid.toString()) {
      ctx.body = { code: 500, msg: "没有操作权限" };
      return;
    }
    if (post.isEnd !== "0") {
      ctx.body = { code: 500, msg: "文章已结束，无法编辑" };
      return;
    }

    const r = await PostModel.updateOne({ _id, uid, isEnd: "0" }, { $set: fields });
    if (r.matchedCount !== 1) {
      ctx.body = { code: 500, msg: "文章不存在、已结束或没有操作权限" };
      return;
    }
    ctx.body = { code: 200, data: { _id }, msg: "更新帖子成功" };
  });

export const updatePost = createEditPost(EditPostSchema); // 只能改 title、content
export const uploadPostById = createEditPost(EditAllPostSchema); // 除 uid、_id 外都能改
