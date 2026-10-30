import "mongoose";

declare module "mongoose" {
  interface ToObjectOptions<RawDocType = unknown, THydratedDocumentType = HydratedDocument<RawDocType>> {
    /** Keep soft-deleted records in serialized output when explicitly requested. */
    includeDeleted?: boolean;
  }

  interface QueryOptions<DocType = unknown> {
    /** Bypass the default isDeleted filter from baseFields for this query. */
    includeDeleted?: boolean;
  }
}
