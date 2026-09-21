import Router from "@koa/router";

const user = new Router({ prefix: "/user" });
user.get("/", async (ctx) => {
  /* ... */
  ctx.body = { msg: "哈哈哈" };
});

export default user;
