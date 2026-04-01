type Role = "user" | "assistant" | "system";

type ChatLogType = {
  role: Role;
  content: string;
};

type MessageList = ChatLogType[];

type ChatLogsStorageType = {
  [key: string]: MessageList;
};
