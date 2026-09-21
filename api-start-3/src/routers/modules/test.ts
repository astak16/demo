import Router from "@koa/router";
import { testIndex } from "../../controller/test";

const test = new Router({ prefix: "/test" });
test.get("/", testIndex);

export default test;
