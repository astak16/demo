import svgCaptcha from "svg-captcha";
import { getValue, setValue } from "@/config/RedisConfig";
import { subIds } from "@/config";

class PublicController {
  async getCaptcha(ctx) {
    const body = ctx.query;
    const newCaptcha = svgCaptcha.create({
      size: 4,
      ignoreChars: "0oO1ilLI",
      color: true,
      noise: Math.floor(Math.random() * 5),
      width: 150,
      height: 38,
    });

    setValue(body.sid, newCaptcha.text, 10 * 60);
    console.log("图片验证码:", newCaptcha.text);
    ctx.body = {
      code: 200,
      // data: newCaptcha.data,
      data: newCaptcha.text,
    };
  }
  async sendCode(ctx) {
    const { mobile } = ctx.query;
    if (await getValue(mobile)) {
      ctx.body = { code: 501, msg: "短信正在发送中，请勿重新发送" };
      return;
    }
    const sms = String(Math.random()).slice(-6);
    setValue(mobile, sms, 10 * 60);
    ctx.body = { code: 200, msg: "发送成功", data: sms };
  }

  async getHotPost(ctx) {
    const params = ctx.query;
    const page = params.page ? parseInt(params.page) : 0;
    const limit = params.limit ? parseInt(params.limit) : 10;
    const index = params.index ? params.index : "0";
    let startTime = "";
    let endTime = "";

    // index 0 -> 3日内
    // index 1 -> 7日内
    // index 2 -> 30日内
    // index 3 -> 全部
    if (index === "0") {
      startTime = dayjs().subtract(2, "day").format("YYYY-MM-DD 00:00:00");
    } else if (index === "1") {
      startTime = dayjs().subtract(6, "day").format("YYYY-MM-DD 00:00:00");
    } else if (index === "2") {
      startTime = dayjs().subtract(29, "day").format("YYYY-MM-DD 00:00:00");
    }
    endTime = dayjs().add(1, "day").format("YYYY-MM-DD 00:00:00");

    const result = await PostModel.getHotPost(page, limit, startTime, endTime);
    const total = await PostModel.getHotPostCount(page, limit, startTime, endTime);
    ctx.body = { code: 200, data: result, total, msg: "获取热门文章成功" };
  }

  async getHotComments(ctx) {
    const params = ctx.query;
    const page = params.page ? parseInt(params.page) : 0;
    const limit = params.limit ? parseInt(params.limit) : 10;
    const index = params.index ? params.index : "0";
    // 0. 热门评论
    // 1. 最新评论
    const result = await Comments.getHotComments(page, limit, index);
    const total = await Comments.getHotCommentsCount(index);
    ctx.body = { code: 200, data: result, total, msg: "获取热门评论成功" };
  }

  async getHotSignRecord(ctx) {
    const params = ctx.query;
    const page = params.page ? parseInt(params.page) : 0;
    const limit = params.limit ? parseInt(params.limit) : 10;
    const index = params.index ? params.index : "0";
    // 0. 总签到榜
    // 1. 最新签到
    let result,
      total = 0;
    if (index === "0") {
      result = await User.getTotalSign(page, limit);
      total = await User.getTotalSignCount();
    } else if (index === "1") {
      // result = await SignRecord.getLatestSign(page, limit);
      // total = await SignRecord.getSignCount();
      result = await SignRecord.getTopSign(page, limit);
      total = await SignRecord.getTopSignCount();
    }
    ctx.body = { code: 200, data: result, total, msg: "获取签到排行成功" };
  }

  getSubIds(ctx) {
    ctx.body = { code: 200, data: subIds };
  }
}

export default new PublicController();
