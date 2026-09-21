import combineRoutes from "koa-combine-routers";
import adminRouter from "./modules/adminRouter.ts";
import commentRouter from "./modules/commentRouter.ts";
import contentRouter from "./modules/contentRouter.ts";
import loginRouter from "./modules/loginRouter.ts";
import publicRouter from "./modules/publicRouter.ts";
import userRouter from "./modules/userRouter.ts";

const modules = [adminRouter, commentRouter, contentRouter, loginRouter, publicRouter, userRouter];
const compatibleRouters = modules as unknown as Parameters<typeof combineRoutes>[0];

export default combineRoutes(compatibleRouters);
