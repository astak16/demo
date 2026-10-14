import { z } from "zod";

export const SetCollectSchema = z.object({
  tid: z.string().min(1, "tid不能为空字符串"),
  isFav: z.literal([0, 1]),
  title: z.string().min(1, "title不能为空字符串"),
});
