import { Types } from "mongoose";
import { z } from "zod";

const objectId = z.string().refine((v) => Types.ObjectId.isValid(v), { message: "Invalid ObjectId" });

const BasePostTagSchema = z.object({
  _id: objectId,
  tagName: z.string().min(1, "tagName 不能为空").optional(),
  tagClass: z.string().min(1, "tagClass 不能为空").optional(),
});

export const AddPostTagSchema = BasePostTagSchema.omit({ _id: true });
export const EditPostTagSchema = BasePostTagSchema;
export const DeletePostTagSchema = z.object({ _ids: z.array(objectId) });
