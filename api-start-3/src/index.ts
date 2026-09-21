import Koa from "koa";
import { port } from "./config";
import routers from "./routers";

const app = new Koa();

app.use(routers.routes());

app.listen(port, () => {
  console.log(`app is run at http://localhost:${port}`);
});
