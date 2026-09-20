declare namespace NodeJS {
  interface Global {
    ws: unknown;
  }
}

interface RequireContext {
  (modulePath: string): { default: unknown };
  keys(): string[];
}

interface NodeRequire {
  context(directory: string, recursive: boolean, pattern: RegExp): RequireContext;
}
