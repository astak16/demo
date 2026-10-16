import { z } from "zod";

export const CaptchaSchema = z.object({
  sid: z.string({ error: "sid必填" }).min(1, "sid不能为空字符串"),
  code: z.string({ error: "code必填" }).min(1, "code不能为空字符串"),
});

export const RegSchema = z
  .object({
    username: z.string({ error: "username必填" }).min(1, "username不能为空字符串"),
    password: z.string({ error: "password必填" }).min(1, "password不能为空字符串"),
  })
  .extend(CaptchaSchema.shape);

export const LoginSchema = RegSchema;

export const ForgetPasswordSchema = z.object({
  username: z.string({ error: "username必填" }).min(1, "username不能为空字符串"),
});

export const ResetPasswordSchema = z
  .object({
    key: z.string({ error: "key必填" }).min(1, "key不能为空字符串"),
    password: z.string({ error: "password必填" }).min(1, "password不能为空字符串"),
  })
  .extend(CaptchaSchema.shape);
