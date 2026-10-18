import "mongoose";

declare module "mongoose" {
  interface QueryOptions<DocType = unknown> {
    /** Bypass the default isDeleted filter from baseFields for this query. */
    includeDeleted?: boolean;
  }
}
