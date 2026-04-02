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
  assistant: string;
};

type SessionInfo = Omit<Session, "assistant"> & { assistant: Assistant };

type SessionList = Session[];

type Assistant = {
  id: string;
  name: string;
  description?: string;
  prompt: string;
  temperature: number;
  max_log: number;
  max_tokens: number;
};

type AssistantList = Assistant[];

type EditAssistant = Omit<Assistant, "id"> & Partial<Pick<Assistant, "id">>;
