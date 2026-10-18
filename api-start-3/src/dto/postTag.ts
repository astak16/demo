import { z } from "zod";

const tagId = z.string().min(1, "_id 不能为空");

const BasePostTagSchema = z.object({
  _id: tagId,
  tagName: z.string().min(1, "tagName 不能为空").optional(),
});

export const AddPostTagSchema = BasePostTagSchema;
export const EditPostTagSchema = BasePostTagSchema;
export const DeletePostTagSchema = z.object({ _ids: z.array(tagId) });
