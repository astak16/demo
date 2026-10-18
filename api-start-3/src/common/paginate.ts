import type { Model, PopulateOptions, QueryFilter, QueryOptions } from "mongoose";

interface PageOptions {
  page?: number; // 从 0 开始
  limit?: number;
  sort?: Record<string, 1 | -1>;
  select?: string;
  populate?: PopulateOptions | PopulateOptions[];
  queryOptions?: QueryOptions;
}

export const paginate = async <T>(
  model: Model<T>,
  filter: QueryFilter<T> = {},
  { page = 0, limit = 10, sort = { created: -1 }, select, populate, queryOptions }: PageOptions = {},
) => {
  const p = Math.max(0, Math.floor(page));
  const l = Math.min(Math.max(1, Math.floor(limit)), 100);

  const query = model
    .find(filter)
    .sort({ ...sort, _id: sort._id ?? -1 }) // 先按指定字段排序，再用 _id 保证顺序稳定
    .skip(p * l)
    .limit(l);
  if (select) query.select(select);
  if (populate) {
    for (const option of Array.isArray(populate) ? populate : [populate]) query.populate(option);
  }
  if (queryOptions && "setOptions" in query) query.setOptions(queryOptions);

  const [list, total] = await Promise.all([query.lean(), model.countDocuments(filter)]);

  return { list, total, page: p, limit: l, hasMore: (p + 1) * l < total };
};
