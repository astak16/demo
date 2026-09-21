import SignRecord from "../model/SignRecord.ts";
import User from "../model/User.ts";
import { getJWTPayload } from "../common/Utils.ts";
import dayjs from "dayjs";
import { v4 as uuid } from "uuid";
import { getValue, setValue } from "../config/RedisConfig.ts";
import { baseUrl, JWT_SECRET } from "../config/index.ts";
import jwt from "jsonwebtoken";
import qs from "qs";
import bcrypt from "bcrypt";
import UserCollect from "../model/UserCollect.ts";

type HandlerContext = import("../types.ts").AppContext;
import Comments from "../model/Comments.ts";
import CommentsHands from "../model/CommentsHands.ts";

class UserController {
  async userSign(ctx: HandlerContext) {
    const obj = await getJWTPayload(ctx.headers.authorization);
    const record = await SignRecord.findByUid(obj._id);
    const user = await User.findByID(obj._id);
    let newRecord: { save(): Promise<unknown> } | undefined;
    let result = {};
    if (record) {
      if (dayjs(record.created).isSame(dayjs(), "day")) {
        ctx.body = {
          code: 500,
          favs: user.favs,
          count: user.count,
          msg: "今日已签到，明天再来吧",
        };
        return;
      } else {
        let count = user.count;
        let fav = 0;

        if (dayjs(record.created).isSame(dayjs().subtract(1, "day"), "day")) {
          count += 1;
          if (count < 5) {
            fav = 5;
          } else if (count >= 5 && count < 15) {
            fav = 10;
          } else if (count >= 15 && count < 30) {
            fav = 15;
          } else if (count >= 30 && count < 100) {
            fav = 20;
          } else if (count >= 100 && count < 365) {
            fav = 30;
          } else if (count >= 365) {
            fav = 50;
          }
          await User.updateOne({ _id: obj._id }, { $inc: { favs: fav, count: 1 } });
          result = {
            favs: user.favs + fav,
            count: user.count + 1,
          };
        } else {
          fav = 5;
          await User.updateOne(
            { _id: obj._id },
            {
              $set: { count: 1 },
              $inc: { favs: fav },
            },
          );
          result = {
            favs: user.favs + fav,
            count: 1,
          };
        }
        newRecord = new SignRecord({
          uid: obj._id,
          favs: fav,
        });
        await newRecord.save();
      }
    } else {
      await User.updateOne({ _id: obj._id }, { $set: { count: 1 }, $inc: { favs: 5 } });
      newRecord = new SignRecord({
        uid: obj._id,
        favs: 5,
      });
      await newRecord.save();
      result = { favs: user.favs + 5, count: 1 };
    }
    ctx.body = {
      code: 200,
      ...result,
      msg: "请求成功",
    };
  }

  async updateUserInfo(ctx: HandlerContext) {
    const body = ctx.request.body;
    const obj = await getJWTPayload(ctx.headers.authorization);
    const user = await User.findOne({ _id: obj._id });
    if (body.username && body.username !== user.username) {
      const tempUser = await User.findOne({ username: body.username });
      if (tempUser && tempUser.password) {
        ctx.body = {
          code: 500,
          msg: "用户名已存在，请更换用户名",
        };
        return;
      }
      const key = uuid();
      setValue(key, jwt.sign({ _id: obj._id }, JWT_SECRET, { expiresIn: "30m" }), 30 * 60);
      const url = `${baseUrl}/public/reset-email?${qs.stringify({ key, username: body.username })}`;
      ctx.body = {
        code: 500,
        msg: "修改用户名需要重新验证身份，请前往验证",
        key,
        url,
      };
    }
    const arr = ["password", "username", "mobile"];
    arr.map((item) => {
      delete body[item];
    });
    const result = await User.updateOne({ _id: obj._id }, body);

    if (result.modifiedCount === 1) {
      ctx.body = {
        code: 200,
        msg: "更新成功",
      };
    } else {
      ctx.body = {
        code: 500,
        msg: "更新失败",
      };
    }
  }

  async updateUserName(ctx: HandlerContext) {
    const body = ctx.query;
    console.log("body", body);
    if (body.key) {
      const token = await getValue(body.key);
      const obj = await getJWTPayload("Bearer " + token);
      console.log("obj", obj);
      const a = await User.updateOne({ _id: obj._id }, { username: body.username });
      console.log("result", a);
      ctx.body = {
        code: 200,
        msg: "用户名修改成功",
      };
    }
  }

  async changePassword(ctx: HandlerContext) {
    const body = ctx.request.body;
    const obj = await getJWTPayload(ctx.headers.authorization);
    const user = await User.findOne({ _id: obj._id });
    if (!bcrypt.compareSync(body.oldpwd, user.password)) {
      ctx.body = {
        code: 500,
        msg: "旧密码输入错误，请重新输入",
      };
      return;
    }
    const result = await User.updateOne({ _id: obj._id }, { password: bcrypt.hashSync(body.newpwd, 5) });
    if (result.modifiedCount === 1) {
      ctx.body = {
        code: 200,
        msg: "密码修改成功",
      };
    } else {
      ctx.body = {
        code: 500,
        msg: "密码修改失败",
      };
    }
  }

  async setCollect(ctx: HandlerContext) {
    const params = ctx.query;
    const obj = await getJWTPayload(ctx.headers.authorization);
    if (parseInt(params.isFav)) {
      await UserCollect.deleteOne({ uid: obj._id, tid: params.tid });
      ctx.body = {
        code: 200,
        msg: "取消收藏成功",
      };
    } else {
      const newCollect = new UserCollect({
        uid: obj._id,
        tid: params.tid,
        title: params.title,
      });
      const result = await newCollect.save();
      ctx.body = {
        code: 200,
        data: result,
        msg: "收藏成功",
      };
    }
  }

  // 获取历史消息
  // 记录评论之后，给作者发送消息
  async getHands(ctx: HandlerContext) {
    const params = ctx.query;
    const page = params.page ? params.page : 0;
    const limit = params.limit ? parseInt(params.limit) : 0;
    // 方法一： 嵌套查询 -> aggregate
    // 方法二： 通过冗余换时间
    const obj = await getJWTPayload(ctx.header.authorization);
    const result = await CommentsHands.getHandsByUid(obj._id, page, limit);

    ctx.body = {
      code: 200,
      data: result,
    };
  }

  async getCollectByUid(ctx: HandlerContext) {
    const params = ctx.query;
    const obj = await getJWTPayload(ctx.headers.authorization);
    const result = await UserCollect.getListByUid(obj._id, params.page, params.limit ? parseInt(params.limit) : 10);
    const total = await UserCollect.countByUid(obj._id);
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
  async getBasicInfo(ctx: HandlerContext) {
    const params = ctx.query;
    const uid = params.uid || ctx._id;
    const user = { ...(await User.findByID(uid))?.toJSON(), isSign: false };
    const date = dayjs().format("YYYY-MM-DD");
    const result = await SignRecord.findOne({
      uid,
      created: { $gte: date + " 00:00:00" },
    });
    if (user && result && result.uid) {
      user.isSign = true;
    } else {
      user.isSign = false;
    }
    if (user) {
      ctx.body = {
        code: 200,
        data: user,
        msg: "获取用户基本信息成功",
      };
    } else {
      ctx.body = {
        code: 500,
        msg: "获取用户基本信息失败",
      };
    }
  }
  async getMsg(ctx: HandlerContext) {
    const params = ctx.query;
    const page = params.page ? parseInt(params.page) : 0;
    const limit = params.limit ? parseInt(params.limit) : 0;
    const obj = await getJWTPayload(ctx.headers.authorization);
    const num = await Comments.getTotal(obj._id);
    const result = await Comments.getMsgList(obj._id, page, limit);
    ctx.body = {
      code: 200,
      data: result,
      total: num,
    };
  }

  async setMsg(ctx: HandlerContext) {
    const params = ctx.query;
    if (params.id) {
      const result = await Comments.updateOne({ _id: params.id }, { isRead: "1" });
      if (result) {
        ctx.body = {
          code: 200,
        };
      }
    } else {
      const obj = await getJWTPayload(ctx.headers.authorization);
      const result = await Comments.updateMany({ uid: obj._id }, { isRead: "1" });
      if (result) {
        ctx.body = {
          code: 200,
        };
      }
    }
  }
  async getUsers(ctx: HandlerContext) {
    let params = ctx.query;
    params = qs.parse(params);
    const page = params.page ? parseInt(params.page) : 0;
    const limit = params.limit ? parseInt(params.limit) : 0;
    const sort = params.sort ? params.sort : "created";
    const options = params.option || {};

    // datepicker -> item: string, search -> array starttime,endtime
    // radio -> key-value $in
    // select -> key-value $in
    let query: Record<string, unknown> = {};
    const hasSearch = Array.isArray(options.search)
      ? options.search.length > 0
      : typeof options.search === "string"
        ? options.search.trim() !== ""
        : options.search !== undefined && options.search !== null;
    if (hasSearch) {
      if (options.item === "created") {
        const start = options.search[0];
        const end = options.search[1];
        query = { created: { $gte: new Date(start), $lt: new Date(end) } };
      } else if (options.item === "roles") {
        query = { roles: { $in: options.search } };
      } else if (["name", "username"].includes(options.item)) {
        query[options.item] = { $regex: new RegExp(String(options.search)) };
      } else {
        query[options.item] = options.search;
      }
    }

    const result = await User.getList(query, sort, page, limit);
    const total = await User.countList(query);
    ctx.body = {
      code: 200,
      data: result,
      total,
    };
  }

  async deleteUserById(ctx: HandlerContext) {
    const { body } = ctx.request;

    const result = await User.deleteMany({ _id: { $in: body.ids } });
    ctx.body = {
      code: 200,
      msg: "删除成功",
      data: result,
    };
  }

  async updateUserById(ctx: HandlerContext) {
    const { body } = ctx.request;
    const user = await User.findOne({ _id: body._id });
    if (!user) {
      ctx.body = {
        code: 500,
        msg: "用户信息不存在或者 id 信息错误",
      };
      return;
    }
    if (body.username !== user.username) {
      const userCheckName = await User.findOne({ username: body.username });
      if (userCheckName) {
        ctx.body = {
          code: 501,
          msg: "用户名已存在，请更换用户名",
        };
        return;
      }
    }
    if (body.password) {
      body.password = await bcrypt.hash(body.password, 5);
    }

    const result = await User.updateOne({ _id: body._id }, body);
    console.log("result", result);
    if (!result.acknowledged) {
      ctx.body = {
        code: 500,
        msg: "服务异常，更新失败",
      };
    } else if (result.matchedCount === 0) {
      ctx.body = {
        code: 404,
        msg: "用户不存在",
      };
    } else {
      ctx.body = {
        code: 200,
        msg: result.modifiedCount > 0 ? "更新成功" : "数据没有变化",
        data: result,
      };
    }
  }

  async updateUserBatch(ctx: HandlerContext) {
    const { body } = ctx.request;
    const result = await User.updateMany({ _id: { $in: body.ids } }, { $set: { ...body.settings } });
    ctx.body = { code: 200, data: result };
  }

  async checkUsername(ctx: HandlerContext) {
    const params = ctx.query;
    const user = await User.findOne({ username: params.username });
    // 默认是 1 - 校验通过，0-校验失败
    let result = 1;
    if (user) {
      result = 0;
    }
    ctx.body = {
      code: 200,
      data: result,
      msg: result === 0 ? "用户名已经存在，更新失败" : "用户名可用",
    };
  }

  async addUser(ctx: HandlerContext) {
    const { body } = ctx.request;
    body.password = await bcrypt.hash(body.password, 5);
    const user = new User(body);
    const result = await user.save();
    const userObj = result.toJSON();
    const arr = ["password"];
    arr.map((item) => {
      delete (userObj as Record<string, unknown>)[item];
    });
    if (result) {
      ctx.body = {
        code: 200,
        msg: "添加用户成功",
        data: userObj,
      };
    } else {
      ctx.body = {
        code: 500,
        msg: "服务接口异常",
      };
    }
  }
}

export default new UserController();
