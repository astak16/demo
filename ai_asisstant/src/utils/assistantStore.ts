import { ASSISTANT_INIT, ASSISTANT_STORE } from "./constant";
import { getLocal, setLocal } from "./storage";

export const getList = (): AssistantList => {
  let list = getLocal<AssistantList>(ASSISTANT_STORE) as AssistantList;
  if (!list) {
    list = ASSISTANT_INIT.map((item, index) => ({ ...item, id: index + Date.now().toString() }));
    updateList(list);
  }
  return list;
};

const updateList = (list: AssistantList): void => {
  setLocal(ASSISTANT_STORE, list);
};

export const addAssistant = (assistant: Assistant): AssistantList => {
  const list = getList();
  list.push(assistant);
  updateList(list);
  return list;
};

export const updateAssistant = (id: string, data: Partial<Omit<Assistant, "id">>): AssistantList => {
  const list = getList();
  const index = list.findIndex((item) => item.id === id);
  if (index !== -1) {
    list[index] = { ...list[index], ...data };
    updateList(list);
  }
  return list;
};

export const removeAssistant = (id: string): AssistantList => {
  const list = getList();
  const newList = list.filter((item) => item.id !== id);
  updateList(newList);
  return newList;
};

export const getAssistant = (id: string): Assistant | null => {
  const list = getList();
  return list.find((item) => item.id === id) || null;
};
