import { z } from "zod";
import { CaptchaSchema } from "./login";
import { Types } from "mongoose";

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), { message: "Invalid ObjectId" });

const PostBaseSchema = z
  .object({
    title: z.string().min(1, "title不能为空字符串"),
    content: z.string().min(1, "content不能为空字符串"),
  })
  .extend(CaptchaSchema.shape);

const PostFieldsSchema = z.object({
  uid: objectId,
  _id: objectId,
  catalog: z.string().min(1, "catalog不能为空字符串"),
  fav: z.number().int().min(0).max(100),
  isEnd: z.string(),
  status: z.string(),
  sort: z.coerce.string(),
  tags: z.array(z.string()),
});

export const AddPostSchema = PostBaseSchema.extend(PostFieldsSchema.pick({ catalog: true, fav: true }).shape);

export const EditPostSchema = PostBaseSchema.extend({ tid: objectId }).extend(
  PostFieldsSchema.pick({ catalog: true, tags: true }).partial().shape,
);
