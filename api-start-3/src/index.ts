import Koa from "koa";
import { port } from "./config";
import { connectDB } from "./config/dbHelper";
import { connectRedis } from "./config/redisConfig";
import logger from "./config/logger";
import Logger from "./common/Logger";
import KoaBody from "koa-body";
import routers from "./routers";
import { auth } from "./common/Auth";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const app = new Koa();
app.use(Logger);
app.use(
  KoaBody({
    multipart: true,
    formidable: { keepExtensions: true, maxFileSize: 10 * 1024 * 1024 },
    onError: handleBodyError,
  }),
);
app.use(auth);
app.use(routers.routes());

export function handleBodyError(err: unknown) {
  logger.error({ err }, "koa-body error");
}

type StartupDependencies = {
  connectDatabase: typeof connectDB;
  connectCache: typeof connectRedis;
  listen: typeof app.listen;
  logInfo: typeof logger.info;
  logError: typeof logger.error;
  exit: typeof process.exit;
};

const startupDependencies: StartupDependencies = {
  connectDatabase: connectDB,
  connectCache: connectRedis,
  listen: app.listen.bind(app),
  logInfo: logger.info.bind(logger),
  logError: logger.error.bind(logger),
  exit: process.exit.bind(process),
};

export async function bootstrap(dependencies: StartupDependencies = startupDependencies) {
  await Promise.all([dependencies.connectDatabase(), dependencies.connectCache()]);
  dependencies.listen(port, () => {
    dependencies.logInfo({ port }, `app is run at http://localhost:${port}`);
  });
}

export async function start(dependencies: StartupDependencies = startupDependencies) {
  try {
    await bootstrap(dependencies);
  } catch (err) {
    dependencies.logError("启动失败:", err);
    dependencies.exit(1);
  }
}

export function runMain(dependencies: StartupDependencies = startupDependencies) {
  return start(dependencies);
}

export function launchIfMain(entryPath: string | undefined, modulePath: string, launch: () => void) {
  if (entryPath && path.resolve(entryPath) === modulePath) launch();
}

launchIfMain(process.argv[1], fileURLToPath(import.meta.url), runMain);
