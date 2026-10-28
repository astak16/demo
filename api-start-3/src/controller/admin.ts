import { AppContext } from "../../types/types";
import { getMenuData } from "../common/Utils";
import { withBody } from "../common/Validate";
import { AddMenuSchema, EditMenuSchema, DeleteMenuSchema } from "../dto/menu";
import { AddRoleSchema, DeleteRoleSchema, EditRoleSchema } from "../dto/role";
import MenuModel from "../model/menu";
import RoleModel from "../model/role";
import UserModel from "../model/user";

export const getRolesNames = async (ctx: AppContext) => {
  const result = await RoleModel.find({}, { name: 1, _id: 0 });
  ctx.body = { code: 200, data: result };
};

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

export const getMenus = async (ctx: AppContext) => {
  const result = await MenuModel.find();
  ctx.body = { code: 200, data: result };
};

export const addMenu = withBody(AddMenuSchema, async (ctx, body) => {
  const result = await MenuModel.create(body);
  ctx.body = { code: 200, data: result };
});

export const updateMenu = withBody(EditMenuSchema, async (ctx, body) => {
  const { _id, ...field } = body;
  const result = await MenuModel.updateOne({ _id }, field);
  if (result.matchedCount) {
    ctx.body = { code: 200, msg: "更新成功" };
  } else {
    ctx.body = { code: 500, msg: "更新失败" };
  }
});

export const deleteMenu = withBody(DeleteMenuSchema, async (ctx, body) => {
  const { _id } = body;
  const result = await MenuModel.updateOne({ _id }, { $set: { isDeleted: 1 } });
  if (result.matchedCount) {
    ctx.body = { code: 200, msg: "删除成功" };
  } else {
    ctx.body = { code: 500, msg: "删除失败" };
  }
});

export const getRoutes = async (ctx: AppContext) => {
  const userId = ctx.state.user?._id;
  const user = await UserModel.findById(userId).select("roles");
  if (!user) {
    ctx.body = { code: 500, msg: "没有此用户" };
    return;
  }
  const roles = user.roles ?? [];
  const roleList = await RoleModel.find({ role: { $in: roles } })
    .select("menu -_id")
    .populate({
      path: "menu",
      select: "title path type sort component hideInBread hideInMenu notCache icon link children",
    })
    .lean();
  const menus = [...new Map(roleList.flatMap((role) => role.menu ?? []).map((menu) => [String(menu._id), menu])).values()];
  const rights = menus.map((menu) => String(menu._id));

  ctx.body = { code: 200, data: getMenuData(menus as unknown as Parameters<typeof getMenuData>[0], rights) };
};
