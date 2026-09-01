import path from "node:path";
import { fileURLToPath } from "node:url";

import cookieParser from "cookie-parser";
import express, { type ErrorRequestHandler } from "express";
import createError from "http-errors";
import logger from "morgan";

import goodsRouter from "./routes/goods";
import indexRouter from "./routes/index";
import usersRouter from "./routes/users";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);
app.use("/goods", goodsRouter);

app.use((_req, _res, next) => {
  next(createError(404));
});

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  const status =
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
      ? error.status
      : 500;
  const message = error instanceof Error ? error.message : "Internal Server Error";

  res.status(status).type("text").send(message);
};

app.use(errorHandler);

export default app;
