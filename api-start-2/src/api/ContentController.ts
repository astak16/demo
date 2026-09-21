import Post from "../model/Post.ts";
import Links from "../model/Links.ts";
import dayjs from "dayjs";
import { UploadFilePath } from "../config/index.ts";
import { checkCode, dirExists } from "../common/Utils.ts";
import fs from "fs";
import User from "../model/User.ts";
import { getJWTPayload, rename } from "../common/Utils.ts";
import UserCollect from "../model/UserCollect.ts";
import { wxMsgCheck } from "../common/WxUtils.ts";
import PostTags from "../model/PostTags.ts";

type HandlerContext = import("../types.ts").AppContext;

class ContentController {
  async getPostList(ctx: HandlerContext) {
    // const post = new Post({
    //   title: "测试标题1",
    //   content: "测试内容1",
    //   catalog: "advise",
    //   fav: 20,
    //   isEnd: "0",
    //   reads: "0",
    //   answer: "0",
    //   status: "0",
    //   isTop: "0",
    //   sort: "100",
    //   tags: [
    //     {
    //       name: "精华",
    //       class: "",
    //     },
    //   ],
    // });
    // await post.save();

    const body = ctx.query;
    const page = parseInt(body.page) || 0;
    const limit = parseInt(body.limit) || 20;
    const sort = body.sort || "created";
    const option: Record<string, unknown> = {};

    if (body.catalog) {
      option.catalog = body.catalog;
    }

    if (body.isTop) {
      option.isTop = body.isTop;
    }

    if (body.status) {
      option.status = body.status;
    }

    if (body.isEnd) {
      option.isEnd = body.isEnd;
    }

    if (body.tag) {
      option.tags = { $elemMatch: { name: body.tag } };
    }

    const result = await Post.getList(option, sort, page, limit);
    ctx.body = {
      code: 200,
      data: result,
      msg: "获取文章列表成功",
    };
  }

  async getLinks(ctx: HandlerContext) {
    const result = await Links.find({ type: "links" });
    ctx.body = {
      code: 200,
      data: result,
      msg: "获取友链成功",
    };
  }

  async getTips(ctx: HandlerContext) {
    const result = await Links.find({ type: "tips" });
    ctx.body = {
      code: 200,
      data: result,
      msg: "获取温馨提示成功",
    };
  }

  async getTopWeek(ctx: HandlerContext) {
    const result = await Post.getTopWeek();
    ctx.body = {
      code: 200,
      data: result,
      msg: "获取本周热门成功",
    };
  }

  async uploadImg(ctx: HandlerContext) {
    const file = ctx.request.files.file as { name: string; path: string };
    const today = dayjs().format("YYYYMMDD");
    const dir = `${UploadFilePath}/${today}`;
    await dirExists(dir);
    const destPath = `${dir}/${file.name}`;
    const reader = fs.createReadStream(
      file.path,
      // 设置分片大小
      // { highWaterMark: 1 * 1024 }
    );
    const upStream = fs.createWriteStream(destPath);
    // method 1
    // reader.pipe(upStream);

    // method 2
    const stat = fs.statSync(file.path);
    let totalLength = 0;
    reader.on("data", (chunk) => {
      totalLength += chunk.length;
      // console.log(`上传进度：${((totalLength / stat.size) * 100).toFixed(2)}%`);
      if (!upStream.write(chunk)) {
        reader.pause();
      }
    });
    upStream.on("drain", () => {
      reader.resume();
    });
    reader.on("end", () => {
      upStream.end();
      console.log(`文件总大小：${stat.size}，上传大小：${totalLength}`);
    });
    ctx.body = {
      code: 200,
      data: `${today}/${file.name}`,
      msg: "上传图片成功",
    };
  }

  async addPost(ctx: HandlerContext) {
    const body = ctx.request.body;
    const sid = body.sid;
    const code = body.code;
    const result = await checkCode(sid, code);
    if (result) {
      const obj = await getJWTPayload(ctx.headers.authorization);
      const user = await User.findById({ _id: obj._id });
      if (user.favs < body.fav) {
        ctx.body = {
          code: 501,
          msg: "积分不足，发布失败",
        };
        return;
      } else {
        await User.updateOne({ _id: obj._id }, { $inc: { favs: -body.fav } });
      }
      const newPost = new Post(body);
      newPost.uid = obj._id;
      const result = await newPost.save();
      ctx.body = {
        code: 200,
        data: result,
        msg: "发布文章成功",
      };
    } else {
      ctx.body = {
        code: 500,
        msg: "验证码错误，发布文章失败",
      };
    }
  }

  async addWxPost(ctx: HandlerContext) {
    const body = ctx.request.body;
    const user = await User.findById({ _id: ctx._id });
    const flag = await wxMsgCheck(body.content || "", { user, scene: 3, title: body.title });
    if (!flag) {
      ctx.body = {
        code: 500,
        msg: "内容安全校验失败，请检查",
      };
      return;
    }
    if (user.favs < body.fav) {
      ctx.body = {
        code: 501,
        msg: "积分不足，发布失败",
      };
      return;
    } else {
      await User.updateOne({ _id: ctx._id }, { $inc: { favs: -body.fav } });
    }
    const newPost = new Post(body);
    newPost.uid = ctx._id;
    const result = await newPost.save();
    ctx.body = {
      code: 200,
      data: result,
      msg: "发布文章成功",
    };
  }

  async updatePost(ctx: HandlerContext) {
    const body = ctx.request.body;
    const sid = body.sid;
    const code = body.code;
    const result = await checkCode(sid, code);
    if (result) {
      const obj = await getJWTPayload(ctx.headers.authorization);
      const post = await Post.findOne({ _id: body.tid });
      if (post && post.uid === obj._id && post.isEnd === "0") {
        const result = await Post.updateOne({ _id: body.tid }, body);
        if (result) {
          ctx.body = {
            code: 200,
            data: result,
            msg: "更新成功",
          };
        } else {
          ctx.body = {
            code: 500,
            msg: "更新失败",
          };
        }
      } else {
        ctx.body = {
          code: 401,
          msg: "没有操作权限",
        };
      }
    } else {
      ctx.body = {
        code: 500,
        msg: "验证码错误，发布文章失败",
      };
    }
  }

  async updatePostByTid(ctx: HandlerContext) {
    const { body } = ctx.request;
    const result = await Post.updateOne({ _id: body._id }, body);
    if (result.acknowledged) {
      ctx.body = {
        code: 200,
        data: result,
        msg: "更新帖子成功",
      };
    } else {
      ctx.body = {
        code: 500,
        data: result,
        msg: "编辑帖子，更新失败",
      };
    }
  }

  async updatePostBatch(ctx: HandlerContext) {
    const { body } = ctx.request;
    const result = await Post.updateMany({ _id: { $in: body.ids } }, { $set: { ...body.settings } });
    ctx.body = {
      code: 200,
      data: result,
    };
  }

  async deletePost(ctx: HandlerContext) {
    const { body } = ctx.request;
    const result = await Post.deleteMany({ _id: { $in: body.ids } });
    if (result.acknowledged) {
      ctx.body = {
        code: 200,
        msg: "删除成功",
      };
    } else {
      ctx.body = {
        code: 500,
        msg: "执行删除失败！",
      };
    }
  }

  async getPostDetail(ctx: HandlerContext) {
    const params = ctx.query;
    if (!params.tid) {
      ctx.body = {
        code: 500,
        msg: "参数错误，获取文章详情失败",
      };
      return;
    }
    const post = await Post.findByTid(params.tid);
    let isFav = 0;
    if (ctx.headers.authorization) {
      const obj = await getJWTPayload(ctx.headers.authorization);
      const userCollect = await UserCollect.findOne({ uid: obj._id, tid: params.tid });
      if (userCollect && userCollect.tid) {
        isFav = 1;
      }
    }
    const newPost = { ...post.toJSON(), isFav };
    const result = await Post.updateOne({ _id: params.tid }, { $inc: { reads: 1 } });
    // const result = rename(post.toJSON(), "uid", "user");
    if (post._id && result) {
      ctx.body = {
        code: 200,
        data: newPost,
        msg: "查询文章详情成功",
      };
    } else {
      ctx.body = {
        code: 500,
        msg: "查询文章详情失败",
      };
    }
  }

  async getPostByUid(ctx: HandlerContext) {
    const params = ctx.query;
    const obj = await getJWTPayload(ctx.headers.authorization);
    const page = parseInt(params.page) || 0;
    const limit = parseInt(params.limit) || 10;
    const result = await Post.getListByUid(obj._id, page, limit);
    const total = await Post.countByUid(obj._id);

    if (result.length > 0) {
      ctx.body = {
        code: 200,
        data: result,
        total,
        msg: "查询列表成功",
      };
    } else {
      ctx.body = {
        code: 500,
        msg: "查询列表失败",
      };
    }
  }

  async getPostPublic(ctx: HandlerContext) {
    const params = ctx.query;
    const page = parseInt(params.page) || 0;
    const limit = parseInt(params.limit) || 10;
    const result = await Post.getListByUid(params.uid, page, limit);
    const total = await Post.countByUid(params.uid);

    if (result.length > 0) {
      ctx.body = {
        code: 200,
        data: result,
        total,
        msg: "查询列表成功",
      };
    } else {
      ctx.body = {
        code: 500,
        msg: "查询列表失败",
      };
    }
  }

  async deletePostByUid(ctx: HandlerContext) {
    const params = ctx.query;
    const obj = await getJWTPayload(ctx.headers.authorization);
    const post = await Post.findOne({ _id: params.tid, uid: obj._id });
    if (post.id === params.tid && post.isEnd === "0") {
      const result = await Post.deleteOne({ _id: params.tid });
      if (result) {
        ctx.body = {
          code: 200,
          msg: "删除成功",
        };
        return;
      }
    }
    ctx.body = {
      code: 500,
      msg: "删除失败",
    };
  }

  // 添加标签
  async addTag(ctx: HandlerContext) {
    const { body } = ctx.request;
    const tag = new PostTags(body);
    await tag.save();
    ctx.body = {
      code: 200,
      msg: "标签保存成功",
    };
  }

  // 添加标签
  async getTags(ctx: HandlerContext) {
    const params = ctx.query;
    const page = params.page ? parseInt(params.page) : 0;
    const limit = params.limit ? parseInt(params.limit) : 10;
    const result = await PostTags.getList({}, page, limit);
    const total = await PostTags.countList({});
    ctx.body = {
      code: 200,
      data: result,
      total,
      msg: "查询tags成功！",
    };
  }

  // 删除标签
  async removeTag(ctx: HandlerContext) {
    const params = ctx.query;
    const result = await PostTags.deleteOne({ id: params.ptid });

    ctx.body = {
      code: 200,
      data: result,
      msg: "删除成功",
    };
  }

  // 删除标签
  async updateTag(ctx: HandlerContext) {
    const { body } = ctx.request;
    const result = await PostTags.updateOne({ _id: body._id }, body);

    ctx.body = {
      code: 200,
      data: result,
      msg: "更新成功",
    };
  }
}

export default new ContentController();
