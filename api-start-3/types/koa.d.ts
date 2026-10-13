// src/types/koa.d.ts
import "koa";
import { AuthPayload } from "./types";

declare module "koa" {
  interface DefaultState {
    user?: AuthPayload;
  }
}
