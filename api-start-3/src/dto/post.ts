import { z } from "zod";

export const AddPostSchema = z.object({
  title: z.string().min(1, "title不能为空字符串"),
  catalog: z.string().min(1, "catalog不能为空字符串"),
  content: z.string().min(1, "content不能为空字符串"),
  fav: z.number().int().min(0).max(100),
  sid: z.string({ error: "sid必填" }).min(1, "sid不能为空字符串"),
  code: z.string({ error: "code必填" }).min(1, "code不能为空字符串"),
});
