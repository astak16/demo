import SignRecord from "@/model/SignRecord";
import User from "@/model/User";
import { getJWTPayload } from "@/common/Utils";
import dayjs from "dayjs";
import { v4 as uuid } from "uuid";
import { getValue, setValue } from "@/config/RedisConfig";
import { baseUrl, JWT_SECRET } from "@/config";
import jwt from "jsonwebtoken";
import qs from "qs";
import bcrypt from "bcrypt";
import UserCollect from "@/model/UserCollect";
import Comments from "@/model/Comments";

class UserController {
  async userSign(ctx) {
    const obj = await getJWTPayload(ctx.headers.authorization);
    const record = await SignRecord.findByUid(obj._id);
    const user = await User.findByID(obj._id);
    let newRecord = {};
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
          await User.updateOne(
            { _id: obj._id },
            { $inc: { favs: fav, count: 1 } },
          );
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
      await User.updateOne(
        { _id: obj._id },
        { $set: { count: 1 }, $inc: { favs: 5 } },
      );
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

  async updateUserInfo(ctx) {
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
      setValue(
        key,
        jwt.sign({ _id: obj._id }, JWT_SECRET, { expiresIn: "30m" }),
      );
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

  async updateUserName(ctx) {
    const body = ctx.query;
    console.log("body", body);
    if (body.key) {
      const token = await getValue(body.key);
      const obj = await getJWTPayload("Bearer " + token);
      console.log("obj", obj);
      const a = await User.updateOne(
        { _id: obj._id },
        { username: body.username },
      );
      console.log("a", a);
      ctx.body = {
        code: 200,
        msg: "用户名修改成功",
      };
    }
  }

  async changePassword(ctx) {
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
    const result = await User.updateOne(
      { _id: obj._id },
      { password: bcrypt.hashSync(body.newpwd, 5) },
    );
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

  async setCollect(ctx) {
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
  async getCollectByUid(ctx) {
    const params = ctx.query;
    const obj = await getJWTPayload(ctx.headers.authorization);
    const result = await UserCollect.getListByUid(
      obj._id,
      params.page,
      params.limit ? parseInt(params.limit) : 10,
    );
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
  async getBasicInfo(ctx) {
    const params = ctx.query;
    const uid = params.uid;
    let user = await User.findByID(uid);
    user = user.toJSON();
    const date = dayjs().format("YYYY-MM-DD");
    const result = await SignRecord.findOne({
      uid,
      created: { $gte: date + " 00:00:00" },
    });
    if (result && result.uid) {
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
  async getMsg(ctx) {
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

  async setMsg(ctx) {
    const params = ctx.query;
    if (params.id) {
      const result = await Comments.updateOne(
        { _id: params.id },
        { isRead: "1" },
      );
      if (result) {
        ctx.body = {
          code: 200,
        };
      }
    } else {
      const obj = await getJWTPayload(ctx.headers.authorization);
      const result = await Comments.updateMany(
        { uid: obj._id },
        { isRead: "1" },
      );
      if (result) {
        ctx.body = {
          code: 200,
        };
      }
    }
  }
  async getUsers(ctx) {
    const params = ctx.query;
    const page = params.page ? parseInt(params.page) : 0;
    const limit = params.limit ? parseInt(params.limit) : 0;
    const sort = params.sort ? params.sort : "created";
    const result = await User.getList({}, sort, page, limit);
    const total = await User.countList({});
    ctx.body = {
      code: 200,
      data: result,
      total,
    };
  }
}

export default new UserController();
