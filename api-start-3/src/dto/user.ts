import { z } from "zod";
import { PaginateSchema } from "./paginate";
import { Types } from "mongoose";

const userId = z.string().refine((v) => Types.ObjectId.isValid(v), { message: "Invalid ObjectId" });

export const UpdateBasicInfoSchema = z.object({
  username: z.string().min(1, "username不能为空字符串").optional(),
  name: z.string().min(1, "name不能为空字符串").optional(),
  location: z.string().min(1, "location不能为空字符串").optional(),
  gender: z.string().min(1, "gender不能为空字符串").optional(),
  regmark: z.string().min(1, "regmark不能为空字符串").optional(),
  pic: z.string().min(1, "pic不能为空字符串").optional(),
});

export const ChangePasswordSchema = z.object({
  oldpwd: z.string().min(1, "oldpwd不能为空字符串"),
  newpwd: z.string().min(1, "newpwd不能为空字符串"),
});

export const UpdateUsernameSchema = z.object({
  key: z.string().min(1, "key不能为空字符串"),
  username: z.string().min(1, "username不能为空字符串"),
});

export const UserAllSchema = z
  .object({
    sort: z.string().min(1, "sort 不能是空字符串").optional(),
    item: z.string().min(1, "item 不能是空字符串").optional(),
    search: z.union([z.string().min(1, "search 不能是空字符串"), z.tuple([z.string().min(1), z.string().min(1)])]).optional(),
  })
  .extend(PaginateSchema.shape);

export const DeleteUserSchema = z.object({ _ids: z.array(userId) });

export const AddUserSchema = z.object({
  username: z.string().min(1, "username不能为空字符串").optional(),
  name: z.string().min(1, "name不能为空字符串").optional(),
  location: z.string().min(1, "location不能为空字符串").optional(),
  gender: z.string().min(1, "gender不能为空字符串").optional(),
  regmark: z.string().min(1, "regmark不能为空字符串").optional(),
  roles: z.array(z.string().min(1, "不能是空字符串")).optional(),
  status: z.string().min(1, "status 不能是空字符串").optional(),
  favs: z.number().min(1).optional(),
  mobile: z.string().min(1, "mobile 不能是空字符串").optional(),
  isVip: z.string().min(1, "isVip 不能是空字符串").optional(),
});

export const EditUserSchema = AddUserSchema.extend({ _id: userId });
