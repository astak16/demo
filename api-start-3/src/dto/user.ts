import { z } from "zod";

export const UpdateBasicInfoSchema = z.object({
  username: z.string().min(1, "username不能为空字符串").optional(),
  name: z.string().min(1, "name不能为空字符串").optional(),
  location: z.string().min(1, "location不能为空字符串").optional(),
  gender: z.string().min(1, "gender不能为空字符串").optional(),
  regmark: z.string().min(1, "regmark不能为空字符串").optional(),
  pic: z.string().min(1, "pic不能为空字符串").optional(),
});
