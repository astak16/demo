import Koa from "koa";
import { port } from "./config";
import routers from "./routers";
import { connectDB } from "./config/dbHelper";
import { connectRedis } from "./config/redisConfig";
import logger from "./config/logger";
import Logger from "./common/Logger";
import KoaBody from "koa-body";

const app = new Koa();
app.use(Logger);
app.use(
  KoaBody({
    multipart: true,
    formidable: { keepExtensions: true, maxFileSize: 10 * 1024 * 1024 },
    onError: (err) => logger.error({ err }, "koa-body error"),
  }),
);
app.use(routers.routes());

async function bootstrap() {
  await Promise.all([connectDB(), connectRedis()]); // 并行连接,全部成功才继续
  app.listen(port, () => {
    logger.info({ port }, `app is run at http://localhost:${port}`);
  });
}

bootstrap().catch((err) => {
  logger.error("启动失败:", err);
  process.exit(1);
});
