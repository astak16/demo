import { AppContext } from "../../types/types";
import { paginate } from "../common/paginate";
import { checkCode } from "../common/Utils";
import { withBody, withQuery } from "../common/Validate";
import { PaginateSchema } from "../dto/paginate";
import { AddPostSchema, DeletePostSchema, EditAllPostSchema, EditPostSchema } from "../dto/post";
import { AddPostTagSchema, DeletePostTagSchema, EditPostTagSchema } from "../dto/postTag";
import PostModel from "../model/post";
import PostTagModel from "../model/postTag";
import UserModel from "../model/user";
import z from "zod";

export const getPosts = withQuery(PaginateSchema, async (ctx, query) => {
  const { page, limit } = query;
  const result = await paginate(PostModel, {}, {
    page,
    limit,
    populate: [
      { path: "uid", select: "name" },
      { path: "tags", select: "tagName tagClass isDeleted", options: { includeDeleted: true } },
    ],
  });
  ctx.body = { code: 200, data: result };
});

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

    const post = await PostModel.findById(_id).select("uid isEnd");
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

export const deletedPost = withBody(DeletePostSchema, async (ctx, body) => {
  const _id = ctx.state.user!._id!;
  const { _ids } = body;
  const res = await PostModel.updateMany({ _id: { $in: _ids }, uid: _id, isEnd: "0", isDeleted: 0 }, { $set: { isDeleted: 1 } });
  ctx.body =
    res.modifiedCount > 0
      ? { code: 200, msg: "删除成功", data: { modifiedCount: res.modifiedCount } }
      : { code: 500, msg: "没有可删除的文章" };
});

export const getTags = async (ctx: AppContext) => {
  const result = await PostTagModel.find();
  ctx.body = { code: 200, data: { _id: result } };
};

export const addTag = withBody(AddPostTagSchema, async (ctx, body) => {
  const result = await PostTagModel.create(body);
  ctx.body = { code: 200, data: { _id: result._id } };
});

export const editTag = withBody(EditPostTagSchema, async (ctx, body) => {
  const { _id, ...field } = body;
  const result = await PostTagModel.updateOne({ _id }, field);
  if (result.modifiedCount) {
    ctx.body = { code: 200, msg: "更新成功" };
  } else {
    ctx.body = { code: 500, msg: "更新失败" };
  }
});

export const deleteTag = withBody(DeletePostTagSchema, async (ctx, body) => {
  const result = await PostTagModel.updateMany({ _id: { $in: body._ids } }, { $set: { isDeleted: 1 } });
  ctx.body =
    result.modifiedCount > 0
      ? { code: 200, msg: "删除成功", data: { modifiedCount: result.modifiedCount } }
      : { code: 500, msg: "没有可删除的标签" };
});
