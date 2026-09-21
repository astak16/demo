import { WebSocketServer as WSServer, WebSocket, type ServerOptions } from "ws";
import Comments from "../model/Comments.ts";
import { getJWTPayload } from "../common/Utils.ts";
import type { WebSocketMessage } from "../types.ts";

interface SocketClient {
  readyState: number;
  isAlive?: boolean;
  isAuth?: boolean;
  _id?: string;
  roomId?: string;
  on(event: string, listener: (...args: readonly unknown[]) => void): this;
  send(message: string): void;
  terminate(): void;
}

interface WebSocketOptions {
  port?: number;
  timeInterval?: number;
  isAuth?: boolean;
  options?: ServerOptions;
}

const defaultConfig = {
  port: 3001,
  timeInterval: 30 * 1000,
  isAuth: true,
};

class WebSocketServer {
  private wss!: WSServer;
  private internal: ReturnType<typeof setInterval> | number = 0;
  private port!: number;
  private isAuth!: boolean;
  private options!: ServerOptions;

  constructor(config: WebSocketOptions = {}) {
    const finalConfig = { ...defaultConfig, ...config };
    this.internal = finalConfig.timeInterval;
    this.port = finalConfig.port;
    this.isAuth = finalConfig.isAuth;
    this.options = config.options || {};
  }
  init() {
    this.wss = new WSServer({ port: this.port, ...this.options });
    this.wss.on("connection", (rawSocket) => {
      const ws = rawSocket as unknown as SocketClient;
      ws.isAlive = true;
      ws.on("message", (msg) => this.onMessage(ws, msg.toString()));
      ws.on("close", () => this.onClose(ws));
    });
  }

  onMessage(ws: SocketClient, msg: string) {
    const msgObj = JSON.parse(msg) as WebSocketMessage;
    const events = {
      auth: async () => {
        try {
          const obj = await getJWTPayload(msgObj.message);
          if (obj) {
            ws.isAuth = true;
            ws._id = obj._id;
            const num = await Comments.getTotal(obj._id);
            ws.send(JSON.stringify({ event: "message", message: num }));
          }
        } catch (error) {
          ws.send(
            JSON.stringify({
              event: "noauth",
              message: "please auth again",
            })
          );
        }
      },
      heartbeat: () => {
        if (msgObj.message === "ping") {
          ws.isAuth = true;
        }
      },
      message: () => {
        if (!ws.isAuth && this.isAuth) {
          return;
        }
        this.wss.clients.forEach((rawClient) => {
          const client = rawClient as unknown as SocketClient;
          if (client.readyState === WebSocket.OPEN && client._id === ws._id) {
            this.send(ws._id ?? "", msg);
          }
        });
      },
    };
    events[msgObj.event]();
  }

  send(uid: string, msg: string) {
    this.wss.clients.forEach((rawClient) => {
      const client = rawClient as unknown as SocketClient;
      if (client.readyState === WebSocket.OPEN && client._id === uid) {
        client.send(msg);
      }
    });
  }

  broadcast(msg: string) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  onClose(_ws: SocketClient) {}

  heartbeat() {
    clearInterval(this.internal as ReturnType<typeof setInterval>);
    this.internal = setInterval(() => {
      this.wss.clients.forEach((rawSocket) => {
        const ws = rawSocket as unknown as SocketClient;
        if (!ws.isAlive && ws.roomId) {
          delete ws.roomId;
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.send(JSON.stringify({ event: "heartbeat", message: "ping" }));
      });
    }, Number(this.internal));
  }
}

export default WebSocketServer;
