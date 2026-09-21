import Koa from "koa";
import { port } from "./config";

const app = new Koa();
app.listen(port, () => {
  console.log(`app is run at http://localhost:${port}`);
});
