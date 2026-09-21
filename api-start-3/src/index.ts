import Koa from "koa";
import { port } from "./config";
import routers from "./routers";
import { connectDB } from "./config/dbHelper";
import { connectRedis } from "./config/redisConfig";

const app = new Koa();
app.use(routers.routes());

async function bootstrap() {
  await Promise.all([connectDB(), connectRedis()]); // 并行连接,全部成功才继续
  app.listen(port, () => {
    console.log(`app is run at http://localhost:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error("启动失败:", err);
  process.exit(1);
});
