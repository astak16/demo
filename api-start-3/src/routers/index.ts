import Router from "@koa/router";
import user from "./modules/user";

const api = new Router();

api.use(user.routes());

export default api;
