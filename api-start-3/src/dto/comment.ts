import { Types } from "mongoose";
import { z } from "zod";
import { PaginateSchema } from "./paginate";

const id = z.string().refine((v) => Types.ObjectId.isValid(v), { message: "Invalid ObjectId" });

export const AddCommentSchema = z.object({
  tid: id,
  content: z.string().min(1, "content 不能为空"),
});

export const EditCommentSchema = AddCommentSchema.pick({ content: true }).extend({ _id: id });

export const SetBestSchema = AddCommentSchema.pick({ tid: true }).extend({ _id: id });

export const SetHandSchema = z.object({ cid: id });

export const CommentAllSchema = z
  .object({
    item: z.string().min(1, "item 不能是空字符串").optional(),
    search: z.union([z.string().min(1, "search 不能是空字符串"), z.tuple([z.string().min(1), z.string().min(1)])]).optional(),
  })
  .extend(PaginateSchema.shape);

const commentId = z.string().refine((v) => Types.ObjectId.isValid(v), { message: "Invalid ObjectId" });

export const DeleteCommentSchema = z.object({ _ids: z.array(commentId) });

export const updateCommentsBatchSchema = z.object({
  _ids: z.array(id),
  content: z.string().min(1, "content 不能为空").optional(),
});
