import { MESSAGE_STORE, SESSION_STORE } from "./constant";
import { getLocal, setLocal } from "./storage";
import * as assistantStore from "./assistantStore";

export const getMessageStore = () => {
  let list = getLocal<ChatLogsStorageType>(MESSAGE_STORE);
  if (!list) {
    list = {};
    setLocal(MESSAGE_STORE, list);
  }
  return list;
};

export const getMessage = (id: string) => {
  const logs = getMessageStore();
  return logs[id] || [];
};

export const updateMessage = (id: string, log: MessageList) => {
  const logs = getMessageStore();
  logs[id] = log;
  setLocal(MESSAGE_STORE, logs);
};

export const clearMessage = (id: string) => {
  const logs = getMessageStore();
  if (logs[id]) {
    logs[id] = [];
  }
  setLocal(MESSAGE_STORE, logs);
};

export const getSessionStore = (): SessionList => {
  let list = getLocal<SessionList>(SESSION_STORE);
  if (!list) {
    const session = { name: "chat", id: Date.now().toString(), assistant: assistantStore.getList()[0].id };
    list = [session];
    updateMessage(session.id, []);
    setLocal(SESSION_STORE, list);
  }
  return list;
};

export const updateSessionStore = (list: SessionList) => {
  setLocal(SESSION_STORE, list);
};

export const addSession = (session: Session) => {
  const list = getSessionStore();
  list.push(session);
  updateSessionStore(list);
  return list;
};

export const getSession = (id: string): SessionInfo | null => {
  const list = getSessionStore();
  const session = list.find((session) => session.id === id);
  if (!session) return null;
  const { assistant } = session;

  let assistantInfo = assistantStore.getAssistant(assistant);
  if (!assistantInfo) {
    assistantInfo = assistantStore.getList()[0];
    updateSession(session.id, { assistant: assistantInfo.id });
  }
  return { ...session, assistant: assistantInfo };
};

export const updateSession = (id: string, data: Partial<Omit<Session, "id">>): SessionList => {
  const list = getSessionStore();
  const index = list.findIndex((session) => session.id === id);
  if (index > -1) {
    list[index] = { ...list[index], ...data };
    updateSessionStore(list);
  }
  return list;
};

export const removeSession = (id: string) => {
  const list = getSessionStore();
  const newList = list.filter((session) => session.id !== id);
  updateSessionStore(newList);
  return newList;
};
