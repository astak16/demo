import Koa from "koa";
import { port } from "./config/index.ts";
import compose from "koa-compose";
import { run } from "./common/init.ts";
import JWT from "koa-jwt";
import statics from "koa-static";
import path from "path";
import { fileURLToPath } from "url";
import koaBody from "koa-body";
import cors from "@koa/cors";
import helmet from "koa-helmet";
import jsonutil from "koa-json";
import { JWT_SECRET } from "./config/index.ts";
import ErrorHandle from "./common/ErrorHandle.ts";
import router from "./routes/routes.ts";
import WebSocketServer from "./config/WebSocket.ts";
import Auth from "./common/Auth.ts";
import { init } from "./config/Init.ts";
// import logger from "koa-logger";
import log4js from "./config/Log4j.ts";
import logger1 from "./common/Logger.ts";
import "./common/Cron.ts";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

const app = new Koa();
const ws = new WebSocketServer();
ws.init();
global.ws = ws;

const jwt = JWT({ secret: JWT_SECRET }).unless({ path: [/^\/public/, /\/login/] });

const middleware = compose([
  logger1,
  koaBody({
    multipart: true,
    formidable: { keepExtensions: true, maxFileSize: 10 * 1024 * 1024 },
    onError: (err) => console.log("koaBodyError", err),
  }),
  cors(),
  statics(path.join(currentDir, "../public")),
  jsonutil({ pretty: false, param: "pretty" }),
  helmet(),
  ErrorHandle,
  jwt,
  Auth,
  // logger(),
  // isDevMode?
  log4js.koaLogger(log4js.getLogger("access"), { level: "auto" }),
  log4js.koaLogger(log4js.getLogger("http"), { level: "auto" }),
]);

app.use(middleware);
app.use(router());

app.listen(port, () => {
  console.log(`app is running at http://localhost:${port}`);
  // const logger = log4js.getLogger("out");
  // logger.info("app is runing at " + config.port);
  run();
  init();
});
