import mongoose from "mongoose";
import PostModel from "./post";
import UserModel from "./user";

const Schema = mongoose.Schema;

const CommentsSchema = new Schema(
  {
    tid: { type: Schema.Types.ObjectId, ref: PostModel.modelName },
    uid: { type: Schema.Types.ObjectId, ref: UserModel.modelName },
    cuid: { type: Schema.Types.ObjectId, ref: UserModel.modelName },
    content: { type: String },
    hands: { type: Number, default: 0 },
    status: { type: String, default: "1" },
    isRead: { type: String, default: "0" },
    isBest: { type: String, default: "0" },
  },
  //   { toJSON: { virtuals: true } },
  {
    statics: {
      // - tid：按帖子标题搜索
      // - uid：按发帖用户姓名搜索
      // - cuid：按评论用户姓名搜索
      getCommentsOptions(options: any, page: number, limit: number) {
        let query: Record<string, any> = {};
        if (options?.search) {
          if (typeof options.search === "string" && options.search.trim() !== "") {
            query[options.item] = options.search;
          }
        }
        if (["tid", "cuid", "uid"].includes(options.item)) {
          let arr: any[] = [
            {
              $lookup: {
                from: PostModel.modelName,
                let: { pid: "$tid" },
                pipeline: [{ $match: { $expr: { $eq: ["$_id", "$$pid"] } } }, { $project: { _id: 1, uid: 1, title: 1 } }],
                as: "tid",
              },
            },
            { $replaceRoot: { newRoot: { $mergeObjects: [{ $arrayElemAt: ["$tid", 0] }, "$$ROOT"] } } },
            { $unwind: "$tid" },
          ];
          if (options.item === "tid") {
            arr.push({
              $match: { title: { $regex: options.search, $options: "i" } },
            });
          }
          arr = arr.concat([{ $lookup: { from: UserModel.modelName, localField: "uid", foreignField: "_id", as: "uid" } }]);
          if (options.item === "uid" && options.search.trim() !== "") {
            arr.push({
              $match: { "uid.name": { $regex: options.search, $options: "i" } },
            });
          }
          arr.push({ $unwind: "$uid" });
          arr = arr.concat([{ $lookup: { from: "users", localField: "cuid", foreignField: "_id", as: "cuid" } }]);
          if (options.item === "cuid" && options.search.trim() !== "") {
            arr.push({
              $match: { "cuid.name": { $regex: options.search, $options: "i" } },
            });
          }
          arr = arr.concat([
            { $unwind: "$cuid" },
            { $project: { tid: 1, cuid: { name: 1, _id: 1 }, uid: { name: 1, _id: 1 }, isBest: 1, status: 1, content: 1, created: 1 } },
            { $sort: { created: -1 } },
            { $skip: limit * (page - 1) },
            { $limit: limit },
          ]);

          return this.aggregate(arr);
        }
      },
    },
  },
);

const Comments = mongoose.model("comments", CommentsSchema);

export default Comments;
