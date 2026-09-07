import WebSocket from "ws";
import Comments from "@/model/Comments";

const defaultConfig = {
  port: 3001,
  timeInterval: 30 * 1000,
  isAuth: true,
};

class WebSocketServer {
  constructor(config = {}) {
    const finalConfig = { ...defaultConfig, ...config };
    this.wss = {};
    this.internal = finalConfig.timeInterval;
    this.port = finalConfig.port;
    this.isAuth = finalConfig.isAuth;
    this.options = config.options || {};
  }
  init() {
    this.wss = new WebSocket.Server({ port: this.port, ...this.options });
    this.wss.on("connection", (ws, req) => {
      ws.isAlive = true;
      ws.on("message", (msg) => this.onMessage(ws, msg));
      ws.on("close", () => this.onClose(ws));
    });
  }

  onMessage(ws, msg) {
    const msgObj = JSON.parse(msg);
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
        this.wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN && client._id === ws._id) {
            this.send(msg);
          }
        });
      },
    };
    events[msgObj.event]();
  }

  send(uid, msg) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN && client._id === uid) {
        client.send(msg);
      }
    });
  }

  broadcast(msg) {
    this.wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(msg);
      }
    });
  }

  onClose(ws) {}

  heartbeat() {
    clearInterval(this.internal);
    this.internal = setInterval(() => {
      this.wss.clients.forEach((ws) => {
        if (!ws.isAlive && ws.roomId) {
          delete ws.roomId;
          return ws.terminate();
        }
        ws.isAlive = false;
        ws.send(JSON.stringify({ event: "heartbeat", message: "ping" }));
      });
    }, this.internal);
  }
}

export default WebSocketServer;
