import type { Context } from "koa";

export type Scalar = string | number | boolean | null;
export type JsonValue = Scalar | JsonValue[] | { [key: string]: JsonValue };
export type QueryValue = string | string[] | undefined;
export type Query = Record<string, any>;
export type RequestBody = Record<string, any>;

export interface AuthPayload {
  _id: string;
  username?: string;
  roles?: string[];
  [key: string]: JsonValue | undefined;
}

export interface AppContext extends Context {
  _id?: string;
  query: Query;
  isAdmin?: boolean;
  request: Context["request"] & {
    body: RequestBody;
    files?: Record<string, UploadedFile | UploadedFile[] | undefined>;
  };
}

export interface UploadedFile {
  name: string;
  path: string;
  type?: string;
  size?: number;
}

export interface WebSocketMessage {
  event: "auth" | "heartbeat" | "message";
  message: string;
}

export interface MenuNode {
  _id: { toString(): string };
  name?: string;
  title?: string;
  path?: string;
  component?: string;
  type?: string;
  sort?: number | string;
  hideInBread?: boolean;
  HideInMenu?: boolean;
  notCache?: boolean;
  icon?: string;
  link?: string;
  children?: MenuNode[];
  operations?: OperationNode[];
  meta?: Record<string, unknown>;
}

export interface OperationNode {
  _id: { toString(): string };
  path?: string;
  sort?: number | string;
}
