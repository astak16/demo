import { generateToken, getJWTPayload } from "../common/Utils";
import { withBody, withQuery } from "../common/Validate";
import { send } from "../config/MailConfig";
import { getValue, setValue } from "../config/redisConfig";
import {
  UpdateBasicInfoSchema,
  ChangePasswordSchema,
  UpdateUsernameSchema,
  UserAllSchema,
  DeleteUserSchema,
  EditUserSchema,
  AddUserSchema,
  BatchEditUsersSchema,
  CheckUsernameSchema,
} from "../dto/user";
import { CollectSchema, SetCollectSchema } from "../dto/userCollect";
import UserModel from "../model/user";
import { v4 as uuidv4 } from "uuid";
import dayjs from "dayjs";
import bcrypt from "bcrypt";
import UserCollectModel from "../model/userCollect";
import { paginate } from "../common/paginate";
import { AppContext } from "../../types/types";
import PostModel from "../model/post";
import CommentModel from "../model/comment";
import type { PipelineStage } from "mongoose";

export const basic = withBody(UpdateBasicInfoSchema, async (ctx, body) => {
  const { username, ...rest } = body;
  const user = await UserModel.findById(ctx.state.user?._id);
  if (!user) {
    ctx.body = { code: 500, msg: "用户不存在" };
    return;
  }
  let msg = "更新基本资料成功";
  const key = uuidv4();
  if (username && user && username !== user.username) {
    const tmpUser = await UserModel.findOne({ username });
    if (tmpUser && tmpUser.password) {
      ctx.body = { code: 500, msg: "用户名已存在，请重新输入！" };
      return;
    }
    setValue(key, generateToken({ _id: user._id.toString() }, "30m"));
    try {
      await send({
        type: "email",
        data: { username },
        expire: dayjs().add(30, "minutes").format("YYYY-MM-DD HH:mm:ss"),
        email: username,
        user: user?.name ? user.name : username,
      });
    } catch (error) {
      ctx.body = { code: 500, msg: "确认邮件发送失败，请稍后再试" };
      return;
    }
    msg = "更新基本资料成功，账号修改需要邮件确认，请查收邮件！";
  }
  if (Object.keys(rest).length > 0) {
    const result = await UserModel.updateOne({ _id: user._id.toString() }, { $set: rest });
    if (result.matchedCount !== 1) {
      ctx.body = { code: 500, msg: "更新基本资料失败" };
      return;
    }
  }

  ctx.body = { code: 200, msg, data: { key } };
});

export const changePassword = withBody(ChangePasswordSchema, async (ctx, body) => {
  const { oldpwd, newpwd } = body;
  const uid = ctx.state.user?._id;
  if (!uid) {
    ctx.status = 401;
    ctx.body = { code: 401, msg: "未登录" };
    return;
  }
  const user = await UserModel.findOne({ _id: ctx.state.user?._id });
  const ok = !!user?.password && (await bcrypt.compare(oldpwd, user.password));
  if (!ok) {
    ctx.body = { code: 500, msg: "原密码错误" };
    return;
  }

  if (oldpwd === newpwd) {
    ctx.body = { code: 500, msg: "新密码不能与原密码相同" };
    return;
  }

  const hash = await bcrypt.hash(newpwd, 10);
  await UserModel.updateOne({ _id: user?._id }, { $set: { password: hash } });

  ctx.body = { code: 200, msg: "密码更新成功" };
});

export const resetEmail = withBody(UpdateUsernameSchema, async (ctx, body) => {
  const { key, username } = body;
  const token = await getValue(key);
  const userObj = getJWTPayload("Bearer " + token);
  await UserModel.updateOne({ _id: userObj._id }, { $set: { username } });
  ctx.body = {
    code: 200,
    msg: "更新用户名成功",
  };
});

export const getUsers = withQuery(UserAllSchema, async (ctx, query) => {
  const { sort = "created", page, limit, ...field } = query;
  const item = field?.item;
  const rawSearch = field?.search;
  const searchValues = (Array.isArray(rawSearch) ? rawSearch : [rawSearch])
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);

  let options: Record<string, any> = {};
  if (item && rawSearch) {
    if (["name", "username"].includes(item)) {
      options[item] = { $regex: new RegExp(searchValues[0]) };
    } else {
      options[item] = searchValues;
    }
    if (item === "roles") {
      options = { roles: { $in: searchValues } };
    }
    if (item === "created") {
      const [start, end] = searchValues;
      options = { created: { $gte: dayjs(start).format("YYYY-MM-DD"), $lt: dayjs(end).format("YYYY-MM-DD") } };
    }
  }
  const result = await paginate(UserModel, options, { page, limit });
  ctx.body = { code: 200, data: result };
});

export const addUser = withBody(AddUserSchema, async (ctx, body) => {
  const password = await bcrypt.hash("123456", 10);
  try {
    const result = await UserModel.create({ ...body, password });
    ctx.body = { code: 200, data: result };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      ctx.body = { code: 500, msg: "用户名已存在，请重新输入！" };
      return;
    }
    throw error;
  }
});

export const updateUser = withBody(EditUserSchema, async (ctx, body) => {
  const { _id, ...field } = body;
  try {
    await UserModel.updateOne({ _id }, field);
    ctx.body = { code: 200, data: "更新成功" };
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === 11000) {
      ctx.body = { code: 500, msg: "用户名已存在，请重新输入！" };
      return;
    }
    throw error;
  }
});

export const updateUserSettings = withBody(BatchEditUsersSchema, async (ctx, body) => {
  const { _ids, ...field } = body;
  const res = await UserModel.updateMany({ _id: { $in: _ids } }, field);
  ctx.body = res.modifiedCount > 0 ? { code: 200, msg: "更新成功", data: res } : { code: 500, msg: "没有可更新的用户" };
});

export const deleteUser = withBody(DeleteUserSchema, async (ctx, body) => {
  const { _ids } = body;
  const res = await UserModel.updateMany({ _id: { $in: _ids } }, { isDeleted: 1 });
  ctx.body =
    res.modifiedCount > 0
      ? { code: 200, msg: "删除成功", data: { modifiedCount: res.modifiedCount } }
      : { code: 500, msg: "没有可删除的用户" };
});

export const checkUsername = withQuery(CheckUsernameSchema, async (ctx, query) => {
  const { username } = query;

  const user = await UserModel.findOne({ username });
  if (user) {
    ctx.body = { code: 200, data: user };
  } else {
    ctx.body = { code: 200, data: null, msg: `没有找到 username: ${username} 对应的用户` };
  }
});

export const setCollect = withBody(SetCollectSchema, async (ctx, body) => {
  const _id = ctx.state.user?._id!;
  const { title, tid, isFav } = body;

  if (isFav) {
    // 当前已收藏 → 取消，没有记录时 deleteOne 也不会报错，天然幂等
    await UserCollectModel.deleteOne({ uid: _id, tid });
    ctx.body = { code: 200, msg: "取消收藏成功", data: { isCollect: 0 } };
    return;
  }

  await UserCollectModel.updateOne({ uid: _id, tid }, { $setOnInsert: { title } }, { upsert: true });
  ctx.body = { code: 200, msg: "收藏成功", data: { isCollect: 1 } };
});

export const getCollectByUid = withQuery(CollectSchema, async (ctx, query) => {
  const uid = ctx.state.user?._id!;
  const { page, limit } = query;

  const { total, list, hasMore } = await paginate(UserCollectModel, { uid }, { page, limit, select: "tid title created" });
  ctx.body = {
    code: 200,
    data: { list, total, hasMore },
  };
});

export const getStats = async (ctx: AppContext) => {
  interface CountRow {
    _id: string;
    count: number;
  }
  interface CatalogCountRow {
    _id: string | null;
    count: number;
  }

  const inforCardData: number[] = [];
  const time = dayjs().format("YYYY-MM-DD 00:00:00");
  const userNewCount = await UserModel.find({ created: { $lte: time } }).countDocuments();
  const postsCount = await PostModel.find().countDocuments();
  const commentsNewCount = await CommentModel.find({
    created: { $lte: time },
  }).countDocuments();

  const starttime = dayjs().weekday(1).format("YYYY-MM-DD 00:00:00");
  const endtime = dayjs().weekday(8).format("YYYY-MM-DD 00:00:00");
  const weekEndCount = await CommentModel.find({
    created: { $gte: starttime, $lte: endtime },
    isBest: "1",
  }).countDocuments();

  // const signWeekCount = await SignRecord.find({
  //   created: { $gte: starttime, $lte: endtime },
  // }).countDocuments();

  const postWeekCount = await PostModel.find({
    created: { $gte: starttime, $lte: endtime },
  }).countDocuments();

  inforCardData.push(userNewCount);
  inforCardData.push(postsCount);
  inforCardData.push(commentsNewCount);
  inforCardData.push(weekEndCount);
  // inforCardData.push(signWeekCount);
  inforCardData.push(postWeekCount);

  const postsCatalogCount = await PostModel.aggregate<CatalogCountRow>([
    { $group: { _id: "$catalog", count: { $sum: 1 } } },
  ]);
  const pieData: Record<string, number> = {};
  postsCatalogCount.forEach((item) => {
    if (item._id !== null) pieData[item._id] = item.count;
  });

  const startMonth = dayjs().subtract(5, "M").date(1).format("YYYY-MM-DD 00:00:00");
  const endMonth = dayjs().add(1, "M").date(1).format("YYYY-MM-DD 00:00:00");
  const monthRows = await PostModel.aggregate<CountRow>([
    { $match: { created: { $gte: startMonth, $lt: endMonth } } },
    {
      $group: {
        _id: {
          $dateToString: {
            format: "%Y-%m",
            date: {
              $dateFromString: {
                dateString: "$created",
                format: "%Y-%m-%d %H:%M:%S",
                onError: null,
                onNull: null,
              },
            },
          },
        },
        count: { $sum: 1 },
      },
    },
    { $match: { _id: { $ne: null } } },
    { $sort: { _id: 1 } },
  ]);
  const monthData: Record<string, number> = Object.fromEntries(monthRows.map(({ _id, count }) => [_id, count]));

  const startDay = dayjs().subtract(7, "day").format("YYYY-MM-DD 00:00:00");
  const aggregateByDay = async (
    aggregate: (pipeline: PipelineStage[]) => PromiseLike<CountRow[]>,
  ): Promise<Record<string, number>> => {
    const result = await aggregate([
      { $match: { created: { $gte: startDay } } },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: {
                $dateFromString: {
                  dateString: "$created",
                  format: "%Y-%m-%d %H:%M:%S",
                  onError: null,
                  onNull: null,
                },
              },
            },
          },
          count: { $sum: 1 },
        },
      },
      { $match: { _id: { $ne: null } } },
      { $sort: { _id: 1 } },
    ]);
    return Object.fromEntries(result.map(({ _id, count }) => [_id, count]));
  };

  const dailyPipelineModels = [UserModel, PostModel, CommentModel] as const;
  const [userWeekData, postWeekData, commentsWeekData] = await Promise.all(
    dailyPipelineModels.map((model) => aggregateByDay((pipeline) => model.aggregate<CountRow>(pipeline))),
  );
  // const signWeekData = await _aggregate(SignRecord);

  const dates = Array.from({ length: 7 }, (_, index) =>
    dayjs().subtract(6 - index, "day").format("YYYY-MM-DD"),
  );
  const addData = (counts: Readonly<Record<string, number>>): number[] => dates.map((date) => counts[date] ?? 0);
  const weekData = {
    user: addData(userWeekData),
    post: addData(postWeekData),
    comments: addData(commentsWeekData),
  };

  ctx.body = { code: 200, data: { inforCardData, pieData, monthData, weekData } };
};
