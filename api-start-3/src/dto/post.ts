import { z } from "zod";
import { CaptchaSchema } from "./login";
import { Types } from "mongoose";

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), { message: "Invalid ObjectId" });
const tagId = z.string().min(1, "tag 不能为空");

const PostSchema = z.object({
  _id: objectId,
  // uid: objectId,
  title: z.string().min(1, "title不能为空字符串"),
  content: z.string().min(1, "content不能为空字符串"),
  catalog: z.string().min(1, "catalog不能为空字符串"),
  fav: z.number().int().min(0).max(100),
  isEnd: z.string(),
  status: z.string(),
  sort: z.coerce.string(),
  tags: z.array(tagId),
});

export const EditPostSchema = PostSchema.pick({ _id: true, title: true, content: true }).extend(CaptchaSchema.shape);

export const EditAllPostSchema = EditPostSchema.extend(PostSchema.omit({ _id: true, title: true, content: true }).partial().shape);

export const AddPostSchema = PostSchema.pick({ title: true, content: true, tags: true, catalog: true, fav: true }).extend(
  CaptchaSchema.shape,
);

export const DeletePostSchema = z.object({ _ids: z.array(objectId) });
