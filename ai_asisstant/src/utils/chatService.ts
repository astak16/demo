type StreamParams = { prompt: string; history?: ChatLogType[]; options?: { temperature?: number; max_token?: number } };

// export const getCompletion = async (params: Props) => {
//   const resp = await fetch("/api/chat", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(params),
//   });
//   if (!resp.ok) {
//     throw new Error(`API error: ${resp.statusText}`);
//   }
//   const data = await resp.json();
//   return data;
// };

type Actions = {
  onCompleting: (sug: string) => void;
  onCompleted?: (sug: string) => void;
};

class ChatService {
  private controller: AbortController;
  private static instance: ChatService;
  public actions?: Actions;

  private constructor() {
    this.controller = new AbortController();
  }
  public static getInstance(): ChatService {
    if (!ChatService.instance) {
      ChatService.instance = new ChatService();
    }
    return ChatService.instance;
  }
  public async getStream(params: StreamParams) {
    const { prompt, history = [], options = {} } = params;
    let suggestion = "";
    try {
      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, history, options }),
        signal: this.controller.signal,
      });
      const data = resp.body;
      if (!data) return;
      const reader = data.getReader();
      const decoder = new TextDecoder("utf-8");
      let done = false;
      while (!done) {
        const { value, done: doneReadingStream } = await reader.read();
        done = doneReadingStream;
        const chunkValue = decoder.decode(value);
        suggestion += chunkValue;
        this.actions?.onCompleting(suggestion);
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    } catch (e) {
    } finally {
      this.actions?.onCompleted?.(suggestion);
      this.controller = new AbortController();
    }
  }
  public cancel = () => {
    this.controller.abort();
  };
}

const chatService = ChatService.getInstance();
export default chatService;
