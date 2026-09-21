import ErrorRecord from "../model/ErrorRecord.ts";
import qs from "qs";

type HandlerContext = import("../types.ts").AppContext;

class ErrorController {
  async addError(ctx: HandlerContext) {
    const { body } = ctx.request;
    const error = new ErrorRecord(body);
    const result = await error.save();
    ctx.body = {
      code: 200,
      msg: "保存成功",
      data: result,
    };
  }

  async getErrorList(ctx: HandlerContext) {
    const params = ctx.query;
    const obj = qs.parse(qs.stringify(params));
    const query: Record<string, unknown> = obj.filter && typeof obj.filter === "object" ? { ...obj.filter } : {};

    const methodFilter = await ErrorRecord.aggregate([{ $group: { _id: "$method" } }, { $sort: { _id: 1 } }]);
    const codeFilter = await ErrorRecord.aggregate([{ $group: { _id: "$code" } }, { $sort: { _id: 1 } }]);

    if (typeof query.method === "string") {
      query.method = { $regex: query.method, $options: "i" };
    }

    // 分页
    const page = params.page ? parseInt(params.page) : 0;
    const limit = params.limit ? parseInt(params.limit) : 10;

    const result = await ErrorRecord.find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .sort({ created: -1 });
    const total = await ErrorRecord.find(query).countDocuments();
    ctx.body = {
      code: 200,
      msg: "查询成功",
      data: result,
      total,
      filters: {
        method: methodFilter.map((o) => ({ label: o._id, value: o._id })),
        code: codeFilter.map((o) => ({ label: o._id, value: parseInt(o._id) })),
      },
    };
  }

  async deleteError(ctx: HandlerContext) {
    const { body } = ctx.request;
    const result = await ErrorRecord.deleteMany({ _id: { $in: body.ids } });
    ctx.body = { code: 200, msg: "删除成功", data: result };
  }
}

export default new ErrorController();
