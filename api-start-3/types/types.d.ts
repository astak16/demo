import type { Context } from "koa";

export type Query = Record<string, any>;
export type RequestBody = Record<string, any>;

export interface UploadedFile {
  name: string;
  path: string;
  type?: string;
  size?: number;
}

export interface AppContext extends Context {
  id?: string;
  query: Query;
  isAdmin?: boolean;
  request: Context["request"] & { body: RequestBody; files?: Record<string, UploadedFile | UploadedFile[] | undefined> };
}

export interface AuthPayload {
  _id: string;
  username?: string;
  roles?: string[];
  [key: string]: JsonValue | undefined;
}
