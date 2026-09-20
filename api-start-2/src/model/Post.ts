import mongoose from "@/config/DBHelpler";
import dayjs from "dayjs";

const Schema = mongoose.Schema;

const PostSchema = new Schema({
  uid: { type: String, ref: "users" },
  title: { type: String },
  content: { type: String },
  created: { type: Date },
  catalog: { type: String },
  fav: { type: String },
  isEnd: { type: String, default: "0" },
  reads: { type: Number, default: 0 },
  answer: { type: Number, default: 0 },
  status: { type: String, default: "0" },
  isTop: { type: String, default: "0" },
  sort: { type: String, default: 100 },
  tags: {
    type: [{ name: String, class: String }],
    default: [
      // {
      //   name: '',
      //   class: ''
      // }
    ],
  },
});

PostSchema.pre("save", function (next) {
  this.created = dayjs().format("YYYY-MM-DD HH:mm:ss");
  next();
});

PostSchema.statics = {
  getList: function (option, sort, page, limit) {
    return this.find(option)
      .sort({ [sort]: -1 })
      .skip(page * limit)
      .limit(limit)
      .populate({ path: "uid", select: "name isVip pic" });
  },
  getTopWeek: function () {
    return this.find({ created: { $gte: dayjs().subtract(7, "day") } }, { answer: 1, title: 1 })
      .sort({ answer: -1 })
      .limit(15);
  },
  findByTid: function (tid) {
    return this.findOne({ _id: tid }).populate({ path: "uid", select: "name isVip pic _id" });
  },
  getListByUid: function (id, page, limit) {
    return this.find({ uid: id })
      .skip(page * limit)
      .limit(limit)
      .sort({ created: -1 });
  },
  countByUid: function (id) {
    return this.find({ uid: id }).countDocuments();
  },
  getHotPost: function (page, limit, start, end) {
    let query = {};
    if (start !== "" && end !== "") {
      query = { created: { $gte: start, $lt: end } };
    }
    return this.find(query)
      .skip(limit * page)
      .limit(limit)
      .sort({ answer: -1 });
  },
  getHotPostCount: function (page, limit, start, end) {
    let query = {};
    if (start !== "" && end !== "") {
      query = { created: { $gte: start, $lt: end } };
    }
    return this.find(query).countDocuments();
  },
};

const PostModel = mongoose.model("posts", PostSchema);

export default PostModel;
