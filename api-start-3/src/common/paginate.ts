import type { Model, QueryFilter } from "mongoose";

interface PageOptions {
  page?: number; // 从 0 开始
  limit?: number;
  sort?: Record<string, 1 | -1>;
  select?: string;
}

export const paginate = async <T>(
  model: Model<T>,
  filter: QueryFilter<T> = {},
  { page = 0, limit = 10, sort = { created: -1 }, select }: PageOptions = {},
) => {
  const p = Math.max(0, Math.floor(page));
  const l = Math.min(Math.max(1, Math.floor(limit)), 100);

  const query = model
    .find(filter)
    .sort({ _id: -1, ...sort }) // 追加 _id 作为稳定排序的兜底
    .skip(p * l)
    .limit(l);
  if (select) query.select(select);

  const [list, total] = await Promise.all([query.lean(), model.countDocuments(filter)]);

  return { list, total, page: p, limit: l, hasMore: (p + 1) * l < total };
};
