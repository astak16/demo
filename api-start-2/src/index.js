import Koa from "koa";
import { port } from "./config";
import compose from "koa-compose";
import { run } from "./common/init";
import JWT from "koa-jwt";
import statics from "koa-static";
import path from "path";
import koaBody from "koa-body";
import cors from "@koa/cors";
import helmet from "koa-helmet";
import jsonutil from "koa-json";
import { JWT_SECRET } from "./config";
import ErrorHandle from "./common/ErrorHandle";
import router from "./routes/routes";
import WebSocketServer from "./config/WebSocket";
import Auth from "./common/Auth";
import { init } from "@/config/Init";
// import logger from "koa-logger";
import log4js from "./config/Log4j";
import logger1 from "./common/Logger";
import { isDevMode } from "./config";

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
  statics(path.join(__dirname, "../public")),
  jsonutil({ pretty: false, param: "pretty" }),
  helmet(),
  ErrorHandle,
  jwt,
  Auth,
  // logger(),
  // isDevMode?
  log4js.koaLogger(log4js.getLogger("access", { level: "auto" })),
  log4js.koaLogger(log4js.getLogger("http", { level: "auto" })),
]);

if (!isDevMode) {
  app.use(compose());
}

app.use(middleware);
app.use(router());

app.listen(port, () => {
  console.log(`app is running at http://localhost:${port}`);
  // const logger = log4js.getLogger("out");
  // logger.info("app is runing at " + config.port);
  run();
  init();
});
