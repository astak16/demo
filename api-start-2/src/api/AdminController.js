import Menu from "../model/Menus";

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
}

export default new AdminController();
