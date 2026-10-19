import { z } from "zod";
import { CaptchaSchema } from "./login";
import { Types } from "mongoose";
import { PaginateSchema } from "./paginate";

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), { message: "Invalid ObjectId" });
const tagId = z.string().min(1, "tag 不能为空");

const PostSchema = z.object({
  _id: objectId,
  // uid: objectId,
  title: z.string().min(1, "title 不能为空字符串"),
  content: z.string().min(1, "content 不能为空字符串"),
  catalog: z.string().min(1, "catalog 不能为空字符串"),
  fav: z.number().int().min(0).max(100),
  isEnd: z.string(),
  status: z.string(),
  sort: z.coerce.string(),
  isTop: z.string().min(1, "isTop 不能为空字符串"),
  tags: z.array(tagId),
});

export const EditPostSchema = PostSchema.pick({ _id: true, title: true, content: true }).extend(CaptchaSchema.shape);

export const EditAllPostSchema = EditPostSchema.extend(PostSchema.omit({ _id: true, title: true, content: true }).partial().shape);

export const AddPostSchema = PostSchema.pick({ title: true, content: true, tags: true, catalog: true, fav: true }).extend(
  CaptchaSchema.shape,
);

export const DeletePostSchema = z.object({ _ids: z.array(objectId) });

export const FilterPostSchema = PostSchema.pick({ title: true, catalog: true, isEnd: true, status: true, isTop: true })
  .partial()
  .extend({
    sort: z.string().min(1, "sort 不能为空字符串").optional(),
    tags: z.array(z.string().min(1, "tag 不能为空字符")).optional(),
    ...PaginateSchema.shape,
  });
