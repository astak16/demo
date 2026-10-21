import { Types } from "mongoose";
import { z } from "zod";

const roleId = z.string().refine((v) => Types.ObjectId.isValid(v), { message: "Invalid ObjectId" });

export const AddRoleSchema = z.object({
  name: z.string().min(1, "name 不能为空"),
  role: z.string().min(1, "role 不能为空"),
  desc: z.string().min(1, "desc 不能为空"),
  menu: z.array(z.string().min(1, "menu 不能为空")),
});

export const EditRoleSchema = AddRoleSchema.extend({ _id: roleId });
export const DeleteRoleSchema = z.object({ _ids: z.array(roleId) });
