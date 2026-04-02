import { ActionIcon, Textarea } from "@mantine/core";
import { useState, KeyboardEvent, useEffect } from "react";
import { IconSend, IconEraser, IconSendOff } from "@tabler/icons-react";
import { getCompletion } from "@/utils/getCompletion";
import chatService from "@/utils/chatService";
import * as chatStorage from "@/utils/chatStorage";
import clsx from "clsx";
// const sessionId = "ai_demo";

type Props = {
  sessionId: string;
};

export const Message = ({ sessionId }: Props) => {
  const [prompt, setPrompt] = useState("");
  const [completion, setCompletion] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<MessageList>([]);

  chatService.actions = {
    onCompleting: (sug) => setSuggestion(sug),
    onCompleted: (sug) => setLoading(false),
  };

  useEffect(() => {
    const msg = chatStorage.getMessage(sessionId);
    setMessage(msg);
    if (loading) {
      chatService.cancel();
    }
  }, [sessionId]);

  const updateMessage = (msg: MessageList) => {
    setMessage(msg);
    chatStorage.updateMessage(sessionId, msg);
  };

  const setSuggestion = (suggestion: string) => {
    if (suggestion === "") return;
    const len = message.length;
    const lastMessage = len ? message[len - 1] : null;
    let newList: MessageList = [];
    if (lastMessage?.role === "assistant") {
      newList = [...message.slice(0, len - 1), { ...lastMessage, content: suggestion }];
    } else {
      newList = [...message, { role: "assistant", content: suggestion }];
    }
    setMessages(newList);
  };

  const onKeyDown = (evt: KeyboardEvent<HTMLTextAreaElement>) => {
    if (evt.keyCode === 13 && !evt.shiftKey) {
      evt.preventDefault();
      // getAIResp();
      onSubmit();
    }
  };
  const onClear = () => {
    // chatStorage.clearMessage(sessionId);
    // setMessage([]);
    updateMessage([]);
  };

  const setMessages = (msg: MessageList) => {
    setMessage(msg);
    chatStorage.updateMessage(sessionId, msg);
  };

  const onSubmit = () => {
    if (loading) {
      return chatService.cancel();
    }
    if (!prompt.trim()) return;
    let list: MessageList = [...message, { role: "user", content: prompt }];
    setMessages(list);
    setLoading(true);
    chatService.getStream({
      prompt,
      history: list.slice(-6),
    });
    setPrompt("");
  };

  // const getAIResp = async () => {
  //   setLoading(true);
  //   const list = [
  //     ...chatList,
  //     {
  //       role: "user",
  //       content: prompt,
  //     },
  //   ];
  //   setChatLogs(list);
  //   const resp = await getCompletion({
  //     prompt: prompt,
  //     history: chatList.slice(-4),
  //   });
  //   setPrompt("");
  //   setCompletion(resp.content);
  //   setChatLogs([
  //     ...list,
  //     {
  //       role: "assistant",
  //       content: resp.content,
  //     },
  //   ]);
  //   setLoading(false);
  // };

  return (
    <div className="h-screen flex flex-col items-center w-full">
      <div className={clsx(["flex-col", "h-[calc(100vh-10rem)]", "w-full", "overflow-y-auto", "rounded-sm", "px-8"])}>
        {message.map((item, idx) => (
          <div
            key={`${item.role}-${idx}`}
            className={clsx(
              {
                flex: item.role === "user",
                "flex-col": item.role === "user",
                "items-end": item.role === "user",
              },
              "mt-4",
            )}>
            <div>{item.role}</div>
            <div className={clsx("rounded-md", "shadow-md", "px-4", "py-2", "mt-1", "w-full", "max-w-4xl")}>
              {item.content}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center w-3/5">
        <ActionIcon className="mr-2" disabled={loading} onClick={() => onClear()}>
          <IconEraser></IconEraser>
        </ActionIcon>
        <Textarea
          placeholder="Enter your prompt"
          className="w-full"
          value={prompt}
          disabled={loading}
          onKeyDown={(evt) => onKeyDown(evt)}
          onChange={(evt) => setPrompt(evt.target.value)}></Textarea>
        <ActionIcon className="ml-2" onClick={() => onSubmit()}>
          {loading ? <IconSendOff /> : <IconSend />}
        </ActionIcon>
      </div>
    </div>
  );
};
