import Router from "@koa/router";
import user from "./modules/user";
import test from "./modules/test";

const api = new Router();

api.use(user.routes());
api.use(test.routes());

export default api;
