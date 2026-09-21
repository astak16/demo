interface GlobalWebSocket {
  send(uid: string, message: string): void;
}

declare var ws: GlobalWebSocket;

declare namespace NodeJS {
  interface Global {
    ws: GlobalWebSocket;
  }
}
