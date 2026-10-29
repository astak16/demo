import { z } from "zod";
import { PaginateSchema } from "./paginate";
import { Types } from "mongoose";

export const AddErrorSchema = z.object({
  message: z.string().min(1, "message 不能为空"),
  code: z.string().min(1, "code 不能为空"),
  method: z.string().min(1, "method 不能为空"),
  path: z.string().min(1, "path 不能为空"),
  param: z.any(),
  stack: z.string().min(1, "stack 不能为空"),
});

export const ErrorSchema = PaginateSchema.extend({
  code: z.string().min(1, "code 不能为空").optional(),
  method: z.string().min(1, "method 不能为空").optional(),
});

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), { message: "Invalid ObjectId" });

export const DeleteErrorSchema = z.object({ _ids: z.array(objectId) });
