import Menu from "../model/Menus.ts";
import Role from "../model/Roles.ts";
import User from "../model/User.ts";
import Post from "../model/Post.ts";
import Comments from "../model/Comments.ts";
import SignRecord from "../model/SignRecord.ts";
import dayjs from "dayjs";
import { getMenuData, getRights, sortMenus } from "../common/Utils.ts";
import qs from "qs";
import weekday from "dayjs/plugin/weekday.js";

type HandlerContext = import("../types.ts").AppContext;

dayjs.extend(weekday);

class AdminController {
  async getMenu(ctx: HandlerContext) {
    const result = await Menu.find();
    ctx.body = { code: 200, data: sortMenus(result) };
  }

  async addMenu(ctx: HandlerContext) {
    const { body } = ctx.request;
    const menu = new Menu(body);
    const result = await menu.save();
    ctx.body = { code: 200, data: result };
  }

  async updateMenu(ctx: HandlerContext) {
    const { body } = ctx.request;
    const data = { ...(body as Record<string, unknown>) };
    delete data._id;
    const result = await Menu.updateOne({ _id: body._id }, { ...data });
    ctx.body = { code: 200, data: result };
  }

  async deleteMenu(ctx: HandlerContext) {
    const { body } = ctx.request;
    const result = await Menu.deleteOne({ _id: body._id });
    ctx.body = { code: 200, data: result };
  }

  async getRole(ctx: HandlerContext) {
    const result = await Role.find();
    ctx.body = { code: 200, data: result };
  }

  async addRole(ctx: HandlerContext) {
    const { body } = ctx.request;
    const role = new Role(body);
    const result = await role.save();
    ctx.body = { code: 200, data: result };
  }

  async updateRole(ctx: HandlerContext) {
    const { body } = ctx.request;
    const data = { ...(body as Record<string, unknown>) };
    delete data._id;
    const result = await Role.updateOne({ _id: body._id }, { ...data });
    ctx.body = { code: 200, data: result };
  }

  async deleteRole(ctx: HandlerContext) {
    const { body } = ctx.request;
    const result = await Role.deleteOne({ _id: body._id });
    ctx.body = { code: 200, data: result };
  }

  async getRolesNames(ctx: HandlerContext) {
    const result = await Role.find({}, { menu: 0, desc: 0 });
    ctx.body = { code: 200, data: result };
  }

  async getRoutes(ctx: HandlerContext) {
    const user = await User.findOne({ _id: ctx._id }, { roles: 1 });
    const { roles } = user;
    let menus: string[] = [];
    for (let i = 0; i < roles?.length; i++) {
      const role = roles[i];
      const rights = await Role.findOne({ role }, { menu: 1 });
      menus = menus.concat(rights.menu);
    }
    menus = Array.from(new Set(menus));

    const treeData = await Menu.find({});
    const routes = getMenuData(treeData, menus, ctx.isAdmin);
    ctx.body = { code: 200, data: routes };
  }

  async getOperations(ctx: HandlerContext) {
    const user = await User.findOne({ _id: ctx._id }, { roles: 1 });
    const { roles } = user;

    let menus: string[] = [];
    for (let i = 0; i < roles?.length; i++) {
      const role = roles[i];
      const rights = await Role.findOne({ role }, { menu: 1 });
      menus = menus.concat(rights.menu);
    }
    menus = Array.from(new Set(menus));
    const treeData = await Menu.find({});
    const operations = getRights(treeData, menus);

    // ctx.body = { code: 200, data: operations };
    return operations;
  }

  async getStats(ctx: HandlerContext) {
    let result = {};
    const inforCardData = [];
    const time = dayjs().format("YYYY-MM-DD 00:00:00");
    const nowZero = new Date().setHours(0, 0, 0, 0);

    // 1. 顶部统计
    const userNewCount = await User.find({
      created: { $gte: time },
    }).countDocuments();
    const postsCount = await Post.find({}).countDocuments();
    const commentsNewCount = await Comments.find({ created: { $gte: time } }).countDocuments();
    const starttime = dayjs(nowZero).weekday(1).toDate();
    const endtime = dayjs(nowZero).weekday(8).toDate();
    const weekEndCount = await Comments.find({ created: { $gte: starttime, $lte: endtime }, isBest: "1" }).countDocuments();
    const signWeekCount = await SignRecord.find({ created: { $gte: starttime, $lte: endtime } }).countDocuments();
    const postWeekCount = await Post.find({ created: { $gte: starttime, $lte: endtime } }).countDocuments();

    inforCardData.push(userNewCount);
    inforCardData.push(postsCount);
    inforCardData.push(commentsNewCount);
    inforCardData.push(weekEndCount);
    inforCardData.push(signWeekCount);
    inforCardData.push(postWeekCount);

    // 2. 左侧饼图
    const postsCatalogCount = await Post.aggregate([{ $group: { _id: "$catalog", count: { $sum: 1 } } }]);
    const pieData: Record<string, number> = {};
    postsCatalogCount.forEach((item: { _id: string; count: number }) => {
      pieData[item._id] = item.count;
    });

    // 3. 本周的右侧统计数据
    // 3.1 计算6个月前的时间 1号 00:00:00
    // 3.2 查询数据库中对应时间内的数据 $gte
    // 3.3 group组合 -> sum -> sort排序

    const startMonth = dayjs(nowZero).subtract(11, "M").date(1).format();
    const endMonth = dayjs(nowZero).add(1, "M").date(1).format();

    let monthData = await Post.aggregate([
      { $match: { created: { $gte: new Date(startMonth), $lt: new Date(endMonth) } } },
      { $project: { month: { $dateToString: { format: "%Y-%m", date: "$created" } } } },
      { $group: { _id: "$month", count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    monthData = monthData.reduce((obj, item) => ({ ...obj, [item._id]: item.count }), {});

    // 4. 底部的数据
    const startDay = dayjs().subtract(7, "day").format();
    const _aggregate = async (model: {
      aggregate: (pipeline: object[]) => Promise<Array<{ _id: string; count: number }>>;
    }): Promise<Record<string, number>> => {
      let result = await model.aggregate([
        { $match: { created: { $gte: new Date(startDay) } } },
        { $project: { month: { $dateToString: { format: "%Y-%m-%d", date: "$created" } } } },
        { $group: { _id: "$month", count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
      return result.reduce<Record<string, number>>((obj, item) => ({ ...obj, [item._id]: item.count }), {});
    };
    const userWeekData = await _aggregate(User);
    const signWeekData = await _aggregate(SignRecord);
    const postWeekData = await _aggregate(Post);
    const commentsWeekData = await _aggregate(Comments);

    const dataArr: string[] = [];
    for (let i = 0; i < 6; i++) {
      dataArr.push(
        dayjs()
          .subtract(6 - i, "day")
          .format("YYYY-MM-DD"),
      );
    }

    const addData = (obj: Record<string, number>): number[] => {
      const arr: number[] = [];
      dataArr.forEach((item) => {
        if (obj[item]) {
          arr.push(obj[item]);
        } else {
          arr.push(0);
        }
      });
      return arr;
    };

    const weekData = {
      user: addData(userWeekData),
      sign: addData(signWeekData),
      post: addData(postWeekData),
      comments: addData(commentsWeekData),
    };

    result = { inforCardData, pieData, monthData, weekData };
    ctx.body = { code: 200, data: result };
  }

  async getCommentsAll(ctx: HandlerContext) {
    const params = qs.parse(ctx.query);
    let options = {};
    if (params.options) {
      options = params.options;
    }
    const page = params.page ? parseInt(String(params.page), 10) : 0;
    const limit = params.limit ? parseInt(String(params.limit), 10) : 20;
    // 使用MongoDB中的视图，效率提升1倍
    // const test = await CommentsUsers.find({ 'uid.name': { $regex: 'admin1', $options: 'i' } })
    const result = await Comments.getCommentsOptions(options, page, limit);
    let total = await Comments.getCommentsOptionsCount(options);
    ctx.body = {
      code: 200,
      data: result,
      total,
    };
  }

  async updateCommentsBatch(ctx: HandlerContext) {
    const { body } = ctx.request;
    const result = await Comments.updateMany({ _id: { $in: body.ids } }, { $set: { ...body.settings } });
    ctx.body = {
      code: 200,
      data: result,
    };
  }

  async deleteCommentsBatch(ctx: HandlerContext) {
    const { body } = ctx.request;
    const result = await Comments.deleteMany({ _id: { $in: body.ids } });
    ctx.body = {
      code: 200,
      msg: "删除成功",
      data: result,
    };
  }
}

export default new AdminController();
