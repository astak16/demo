type Role = "user" | "assistant" | "system";

type ChatLogType = {
  role: Role;
  content: string;
};

type MessageList = ChatLogType[];

type ChatLogsStorageType = {
  [key: string]: MessageList;
};

type Session = {
  name: string;
  id: string;
};

type SessionList = Session[];
