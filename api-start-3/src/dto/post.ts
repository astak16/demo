import { z } from "zod";
import { CaptchaSchema } from "./login";

const PostBaseSchema = z
  .object({
    title: z.string().min(1, "title不能为空字符串"),
    content: z.string().min(1, "content不能为空字符串"),
  })
  .extend(CaptchaSchema.shape);

export const AddPostSchema = PostBaseSchema.extend({
  catalog: z.string().min(1, "catalog不能为空字符串"),
  fav: z.number().int().min(0).max(100),
});

export const EditPostSchema = PostBaseSchema.extend({ tid: z.string().min(1, "tid不能为空") });
