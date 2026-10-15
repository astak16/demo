import { checkCode } from "../common/Utils";
import { withBody } from "../common/Validate";
import { AddPostSchema } from "../dto/post";
import PostModel from "../model/post";
import UserModel from "../model/user";

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
