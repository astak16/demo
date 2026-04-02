import { useEffect, useState } from "react";
import * as chatStorage from "@/utils/chatStorage";
import { Message } from "../Message";
import Session from "../Session";
import { MediaQuery } from "@mantine/core";

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
      <MediaQuery smallerThan="md" styles={{ width: "0 !important", padding: "0 !important", overflow: "hidden" }}>
        <>
          <Session sessionId={sessionId} onChange={setSessionId} />
          <Message sessionId={sessionId} />
        </>
      </MediaQuery>
    </div>
  );
};

export default Chat;
