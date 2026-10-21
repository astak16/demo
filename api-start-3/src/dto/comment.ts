import { Types } from "mongoose";
import { z } from "zod";

const id = z.string().refine((v) => Types.ObjectId.isValid(v), { message: "Invalid ObjectId" });

export const AddCommentSchema = z.object({
  tid: id,
  content: z.string().min(1, "content 不能为空"),
});
