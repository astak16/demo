import { Types } from "mongoose";
import { z } from "zod";

const id = z.string().refine((v) => Types.ObjectId.isValid(v), { message: "Invalid ObjectId" });

const BaseMenuSchema = z.object({
  title: z.string().min(1, "title 不能为空字符串"),
  name: z.string().min(1, "name 不能为空字符串"),
  path: z.string().min(1, "path 不能为空字符串"),
  component: z.string().min(1, "component 不能为空字符串").optional(),
  hideInBread: z.boolean().optional(),
  hideInMenu: z.boolean().optional(),
  notCache: z.boolean().optional(),
  icon: z.string().min(1, "icon 不能为空字符串").optional(),
  sort: z.number().min(0, "sort 不能小于 0").optional(),
  link: z.string().min(1, "link 不能为空字符串").optional(),
  redirect: z.string().min(1, "redirect 不能为空字符串").optional(),
  type: z.string().min(1, "type 不能为空字符串").optional(),
  // 配合tree组件，展开对应的树形结构
  expand: z.boolean().optional(),
});

const BaseOperationSchema = z.object({
  name: z.string().min(1, "name 不能为空字符串"),
  type: z.string().min(1, "type 不能为空字符串"),
  method: z.string().min(1, "method 不能为空字符串"),
  path: z.string().min(1, "path 不能为空字符串"),
  remark: z.string().min(1, "remark 不能为空字符串").optional(),
});

type Operation = z.infer<typeof BaseOperationSchema>;
type Menu = z.infer<typeof BaseMenuSchema> & {
  operations?: Operation[];
  children?: Menu[];
};

const MenuNodeSchema: z.ZodType<Menu> = BaseMenuSchema.extend({
  operations: z.array(BaseOperationSchema).optional(),
  children: z.lazy(() => z.array(MenuNodeSchema)).optional(),
});

export const AddMenuSchema = MenuNodeSchema;

export const EditMenuSchema = BaseMenuSchema.partial().extend({
  _id: id,
  operations: z.array(BaseOperationSchema).optional(),
});

export const DeleteMenuSchema = z.object({ _id: id });
