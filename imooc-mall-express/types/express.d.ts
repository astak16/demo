import type { HydratedDocument } from "mongoose";
import type { User } from "../models/users";

declare global {
  namespace Express {
    interface Locals {
      userId: string;
      userInfo: HydratedDocument<User>;
    }
  }
}

export {};
