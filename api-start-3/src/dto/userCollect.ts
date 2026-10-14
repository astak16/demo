import { z } from "zod";

export const SetCollectSchema = z.object({
  tid: z.string().min(1, "tid不能为空字符串"),
  isFav: z.literal([0, 1]),
  title: z.string().min(1, "title不能为空字符串"),
});

export const CollectSchema = z.object({
  page: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});
