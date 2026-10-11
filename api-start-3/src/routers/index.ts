import Router from "@koa/router";
import user from "./modules/user";
import test from "./modules/test";
import login from "./modules/login";
import publicR from "./modules/public";

const api = new Router();

api.use(user.routes());
api.use(publicR.routes());
api.use(login.routes());
api.use(test.routes());

export default api;
