import { Types } from "mongoose";
import { z } from "zod";

const id = z.string().refine((v) => Types.ObjectId.isValid(v), { message: "Invalid ObjectId" });

export const AddCommentSchema = z.object({
  tid: id,
  content: z.string().min(1, "content 不能为空"),
});

export const EditCommentSchema = AddCommentSchema.pick({ content: true }).extend({ _id: id });

export const SetBestSchema = AddCommentSchema.pick({ tid: true }).extend({ _id: id });

export const SetHandSchema = z.object({ cid: id });
