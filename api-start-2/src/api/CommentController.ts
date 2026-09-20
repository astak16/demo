import { checkCode, getJWTPayload } from "@/common/Utils";
import Comments from "@/model/Comments";
import CommentsHands from "@/model/CommentsHands";
import PostModel from "@/model/Post";
import User from "@/model/User";
import dayjs from "dayjs";
import SignRecord from "@/model/SignRecord";

const canReply = async (ctx) => {
  let result = false;
  const obj = await getJWTPayload(ctx.headers.authorization);
  if (!obj._id) {
    return result;
  } else {
    const user = await User.findByID(obj._id);
    if (user.status === "0") {
      result = true;
    }
    return result;
  }
};

class CommentController {
  async getComments(ctx) {
    const params = ctx.query;
    const tid = params.tid;
    const page = params.page ? params.page : 0;
    const limit = params.limit ? params.limit : 10;
    let result = await Comments.getCommentsList(tid, page, limit);
    let obj;
    if (ctx.headers.authorization) {
      obj = await getJWTPayload(ctx.headers.authorization);
    }
    if (obj && obj._id) {
      result = result.map((item) => item.toJSON());
      for (let i = 0; i < result.length; i++) {
        const item = result[i];
        item.handed = "0";
        const commentsHands = await CommentsHands.findOne({ cid: item._id, uid: obj._id });
        if (commentsHands && commentsHands.cid) {
          if (commentsHands.uid === obj._id) {
            item.handed = "1";
          }
        }
      }
    }
    const total = await Comments.queryCount(tid);
    ctx.body = {
      code: 200,
      total,
      data: result,
      msg: "获取评论列表成功",
    };
  }

  async addComment(ctx) {
    const check = await canReply(ctx);
    if (!check) {
      ctx.body = {
        code: 500,
        msg: "用户被禁言",
      };
      return;
    }
    const { body } = ctx.request;
    const sid = body.sid;
    const code = body.code;
    const result = await checkCode(sid, code);
    if (!result) {
      ctx.body = {
        code: 500,
        msg: "验证码不正确",
      };
      return;
    }
    const newComment = new Comments(body);
    const obj = await getJWTPayload(ctx.headers.authorization);
    newComment.cuid = obj._id;
    const post = await PostModel.findOne({ _id: body.tid });
    newComment.uid = post.uid;
    const comment = await newComment.save();
    const num = await Comments.getTotal(post.uid);
    global.ws.send(post.uid, JSON.stringify({ event: "message", message: num }));
    const updatePostResult = await PostModel.updateOne({ _id: body.tid }, { $inc: { comments: 1 } });
    if (comment._id && updatePostResult) {
      ctx.body = {
        code: 200,
        data: comment,
        msg: "评论成功",
      };
    } else {
      ctx.body = {
        code: 500,
        msg: "评论失败",
      };
    }
  }

  async updateComment(ctx) {
    const check = await canReply(ctx);
    if (!check) {
      ctx.body = {
        code: 500,
        msg: "用户被禁言",
      };
      return;
    }
    const { body } = ctx.request;
    const result = await Comments.updateOne({ _id: body.cid }, { $set: body });
    ctx.body = {
      code: 200,
      data: result,
      msg: "修改评论成功",
    };
  }

  async setBest(ctx) {
    const obj = await getJWTPayload(ctx.headers.authorization);
    if (!obj && !obj._id) {
      ctx.body = {
        code: 401,
        msg: "用户未登录，或者未授权",
      };
      return;
    }
    const params = ctx.query;
    const post = await PostModel.findOne({ _id: params.tid });
    if (post && post.uid === obj._id && post.isEnd === "0") {
      const result = await PostModel.updateOne({ _id: params.tid }, { $set: { isEnd: "1" } });
      const result1 = await Comments.updateOne({ _id: params.cid }, { $set: { isBest: "1" } });
      if (result && result1) {
        const comment = await Comments.findByCid(params.cid);
        const result2 = await User.updateOne({ _id: comment.cuid }, { $inc: { favs: parseInt(post.fav) } });
        if (result2) {
          ctx.body = {
            code: 200,
            msg: "设置成功",
          };
        } else {
          ctx.body = {
            code: 500,
            msg: "设置失败",
            result: result2,
          };
        }
      } else {
        ctx.body = {
          code: 500,
          msg: "设置失败",
          result: { ...result, ...result1 },
        };
      }
    } else {
      ctx.body = {
        code: 500,
        msg: "只有文章作者才能设置最佳评论，或者文章已结束",
      };
    }
  }

  async setHands(ctx) {
    const obj = await getJWTPayload(ctx.headers.authorization);
    const params = ctx.query;

    const tmp = await CommentsHands.find({ cid: params.cid, uid: obj._id });
    if (tmp.length > 0) {
      ctx.body = {
        code: 500,
        msg: "你已经点过赞了",
      };
      return;
    }

    const newHands = new CommentsHands({ cid: params.cid, uid: obj._id });
    const data = await newHands.save();
    const result = await Comments.updateOne({ _id: params.cid }, { $inc: { hands: 1 } });
    if (result) {
      ctx.body = {
        code: 200,
        msg: "点赞成功",
        data,
      };
    } else {
      ctx.body = {
        code: 500,
        msg: "点赞失败",
      };
    }
  }

  async getCommentsPublic(ctx) {
    const params = ctx.query;
    const result = await Comments.getCommentsPublic(params.uid, params.page, params.limit ? parseInt(params.limit) : 10);
    if (result.length > 0) {
      ctx.body = {
        code: 200,
        data: result,
        msg: "查询列表成功",
      };
    } else {
      ctx.body = {
        code: 500,
        msg: "查询列表失败",
      };
    }
  }
}

export default new CommentController();
