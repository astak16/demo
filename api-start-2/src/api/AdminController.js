import Menu from "../model/Menus";
import Role from "../model/Roles";
import User from "../model/User";

class AdminController {
  async getMenu(ctx) {
    const result = await Menu.find();
    ctx.body = { code: 200, data: result };
  }

  async addMenu(ctx) {
    const { body } = ctx.request;
    const menu = new Menu(body);
    const result = await menu.save();
    ctx.body = { code: 200, data: result };
  }

  async updateMenu(ctx) {
    const { body } = ctx.request;
    const data = { ...body };
    delete data._id;
    const result = await Menu.updateOne({ _id: body._id }, { ...data });
    ctx.body = { code: 200, data: result };
  }

  async deleteMenu(ctx) {
    const { body } = ctx.request;
    const result = await Menu.deleteOne({ _id: body._id });
    ctx.body = { code: 200, data: result };
  }

  async getRole(ctx) {
    const result = await Role.find();
    ctx.body = { code: 200, data: result };
  }

  async addRole(ctx) {
    const { body } = ctx.request;
    const role = new Role(body);
    const result = await role.save();
    ctx.body = { code: 200, data: result };
  }

  async updateRole(ctx) {
    const { body } = ctx.request;
    const data = { ...body };
    delete data._id;
    const result = await Role.updateOne({ _id: body._id }, { ...data });
    ctx.body = { code: 200, data: result };
  }

  async deleteRole(ctx) {
    const { body } = ctx.request;
    const result = await Role.deleteOne({ _id: body._id });
    ctx.body = { code: 200, data: result };
  }

  async getRolesNames(ctx) {
    const result = await Role.find({}, { menu: 0, desc: 0 });
    ctx.body = { code: 200, data: result };
  }

  async getRoutes(ctx) {
    const user = await User.findOne({ _id: ctx._id }, { roles: 1 });
    const { roles } = user;
    let menus = [];
    for (let i = 0; i < roles?.length; i++) {
      const role = roles[i];
      const rights = await Role.findOne({ role }, { menu: 1 });
      menus = menus.concat(rights.menu);
    }
    menus = Array.from(new Set(menus));
    ctx.body = { code: 200, data: menus };
  }
}

export default new AdminController();
