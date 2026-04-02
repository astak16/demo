import { useEffect, useState } from "react";
import * as chatStorage from "@/utils/chatStorage";
import { Message } from "../Message";
import Session from "../Session";

const Chat = () => {
  const [sessionId, setSessionId] = useState<string>("");
  useEffect(() => {
    const init = () => {
      const list = chatStorage.getSessionStore();
      const id = list[0]?.id;
      if (id) {
        setSessionId(id);
      }
    };
    init();
  }, []);
  return (
    <div className="h-screen flex w-screen">
      <Session sessionId={sessionId} onChange={setSessionId} />
      <Message sessionId={sessionId} />
    </div>
  );
};

export default Chat;
