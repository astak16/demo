import mongoose from "mongoose";
import PostModel from "./post";
import UserModel from "./user";
import dayjs from "dayjs";

const Schema = mongoose.Schema;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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
      async getCommentsOptions(options: any, _page: number, limit: number) {
        const page = _page - 1;
        const item = options?.item;
        const rawSearch = options?.search;
        const searchValues = (Array.isArray(rawSearch) ? rawSearch : [rawSearch])
          .filter((value): value is string => typeof value === "string")
          .map((value) => value.trim())
          .filter(Boolean);

        if (["tid", "cuid", "uid"].includes(item)) {
          const pattern = searchValues.length ? new RegExp(searchValues.map(escapeRegex).join("|"), "i") : undefined;

          const arr: any[] = [
            {
              // $lookup 相当于 left join
              $lookup: {
                from: PostModel.collection.name, // 相当于 left join PostModel
                let: { postId: "$tid" }, // 把 CommentModel._tid 命名成 postId 传给 PostModel
                // pipeline 是聚合查询
                pipeline: [
                  // $match 类似于 where
                  // $expr 按聚合表达式计算
                  { $match: { $expr: { $eq: ["$_id", "$$postId"] } } }, // $eq 用来表达 $_id 和 $$postId 相等
                  { $project: { _id: 1, uid: 1, title: 1 } }, // $project 用来裁剪字段，这里是保留 _id, uid, title
                ],
                // let 和 pipeline 这两个可以不写，简写成 localField 和 foreignField
                // localField: "tid",  CommentModel.tid
                // foreignField: "_id", PostModel._id
                as: "post", // 命令为 post
              },
            },
            { $unwind: "$post" }, // {"post": [{ "_id": "...", "uid": "xxxx", "title": "文章标题" }} => {"post": { "_id": "...", "uid": "xxx" ,"title": "文章标题" }}
          ];

          if (item === "tid" && pattern) {
            arr.push({ $match: { "post.title": pattern } });
          }

          arr.push(
            {
              $lookup: {
                from: UserModel.collection.name,
                localField: "post.uid",
                foreignField: "_id",
                as: "postAuthor",
              },
            },
            { $unwind: "$postAuthor" },
            {
              $lookup: {
                from: UserModel.collection.name,
                localField: "cuid",
                foreignField: "_id",
                as: "commentAuthor",
              },
            },
            { $unwind: "$commentAuthor" },
          );

          if (item === "uid" && pattern) {
            arr.push({ $match: { "postAuthor.name": pattern } });
          }

          if (item === "cuid" && pattern) {
            arr.push({ $match: { "commentAuthor.name": pattern } });
          }

          arr.push({
            // ，可以让同一批筛选后的文档同时走多条子管道，并把各自结果放在同一个输出里
            $facet: {
              data: [
                { $sort: { created: -1, _id: -1 } },
                { $skip: limit * page },
                { $limit: limit },
                {
                  $project: {
                    tid: { _id: "$post._id", uid: "$post.uid", title: "$post.title" },
                    cuid: { _id: "$commentAuthor._id", name: "$commentAuthor.name" },
                    uid: { _id: "$postAuthor._id", name: "$postAuthor.name" },
                    isBest: 1,
                    status: 1,
                    content: 1,
                    created: 1,
                  },
                },
              ],
              total: [{ $count: "count" }],
            },
          });
          arr.push({
            $project: {
              data: 1,
              total: { $ifNull: [{ $arrayElemAt: ["$total.count", 0] }, 0] },
            },
          });

          const [result] = await this.aggregate(arr);
          return result ?? { data: [], total: 0 };
        }

        if (item === "created" && searchValues.length === 2) {
          const [start, end] = searchValues;
          const filter = { created: { $gte: dayjs(start).format("YYYY-MM-DD"), $lt: dayjs(end).format("YYYY-MM-DD") } };
          const [data, total] = await Promise.all([
            this.find(filter)
              .populate({ path: "tid", select: "_id title" })
              .populate({ path: "cuid", select: "_id name" })
              .populate({ path: "uid", select: "_id name" })
              .skip(page * limit)
              .limit(limit)
              .sort({ created: -1 }),
            this.countDocuments(filter),
          ]);
          return { data, total };
        }
        return { data: [], total: 0 };
      },
    },
  },
);

const Comments = mongoose.model("comments", CommentsSchema);

export default Comments;
