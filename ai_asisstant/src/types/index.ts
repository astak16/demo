type ChatLogType = {
  role: string;
  content: string;
};

type ChatLogsType = ChatLogType[];

type ChatLogsStorageType = {
  [key: string]: ChatLogsType;
};
