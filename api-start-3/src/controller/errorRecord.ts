import { AppContext } from "../../types/types";
import { paginate } from "../common/paginate";
import { withQuery, withBody } from "../common/Validate";
import { AddErrorSchema, ErrorSchema, DeleteErrorSchema } from "../dto/errorRecord";
import ErrorRecordModel from "../model/errorRecord";

export const addError = withBody(AddErrorSchema, async (ctx, body) => {
  const userId = ctx.state.user!._id;
  const result = await ErrorRecordModel.create({ ...body, userId });
  ctx.body = { code: 200, data: { _id: result._id }, msg: "添加成功" };
});

export const getErrorList = withQuery(ErrorSchema, async (ctx, query) => {
  const methodFilter = await ErrorRecordModel.aggregate([{ $group: { _id: "$method" } }, { $sort: { _id: 1 } }]);
  const codeFilter = await ErrorRecordModel.aggregate([{ $group: { _id: "$code" } }, { $sort: { _id: 1 } }]);

  const { method, code, page, limit } = query;
  const obj: Record<string, any> = {};
  if (method) {
    obj.method = { $regex: method, $options: "i" };
  }

  const { list, total } = await paginate(ErrorRecordModel, obj, { page, limit });
  ctx.body = { code: 200, data: { list, total, methodFilter, codeFilter } };
});

export const deleteError = withBody(DeleteErrorSchema, async (ctx, body) => {
  const _ids = body._ids;
  const result = await ErrorRecordModel.updateMany({ _id: { $in: _ids } }, { $set: { isDeleted: 1 } });
  ctx.body =
    result.modifiedCount > 0
      ? { code: 200, msg: "删除成功", data: { modifiedCount: result.modifiedCount } }
      : { code: 500, msg: "没有可删除的错误信息" };
});
