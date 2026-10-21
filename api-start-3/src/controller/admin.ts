import { AppContext } from "../../types/types";
import { withBody } from "../common/Validate";
import { AddRoleSchema, DeleteRoleSchema, EditRoleSchema } from "../dto/role";
import RoleModel from "../model/role";

export const addRole = withBody(AddRoleSchema, async (ctx, body) => {
  const result = await RoleModel.create(body);
  ctx.body = { code: 200, data: result._id };
});

export const getRoles = async (ctx: AppContext) => {
  const result = await RoleModel.find({}, { name: 1, role: 1, _id: 0 });
  ctx.body = { code: 200, data: result };
};

export const deleteRole = withBody(DeleteRoleSchema, async (ctx, body) => {
  const { _ids } = body;
  const result = await RoleModel.updateMany({ _id: { $in: _ids } }, { $set: { isDeleted: 1 } });
  ctx.body =
    result.matchedCount > 0
      ? { code: 200, msg: "删除成功", data: { modifiedCount: result.modifiedCount } }
      : { code: 500, msg: "没有可删除的标签" };
});

export const editRole = withBody(EditRoleSchema, async (ctx, body) => {
  const { _id, ...field } = body;
  const result = await RoleModel.updateOne({ _id }, field);
  if (result.matchedCount) {
    ctx.body = { code: 200, msg: "更新成功" };
  } else {
    ctx.body = { code: 500, msg: "更新失败" };
  }
});
