import { ChangeEvent, useEffect, useState } from "react";
import * as assistantStore from "../../utils/assistantStore";
import { Select } from "@mantine/core";

type Props = { value: string; loading: boolean; onChange: (value: Assistant) => void };

const AssistantSelect = ({ value, loading, onChange }: Props) => {
  const [list, setList] = useState<EditAssistant[]>([]);
  useEffect(() => {
    const store = assistantStore.getList();
    setList(store);
  }, []);

  const onAssistantChange = (value: string) => {
    const assistant = list.find((item) => item.id === value && item.id !== undefined);
    if (assistant && assistant.id) {
      onChange(assistant as Assistant);
    }
  };

  return (
    <Select
      size="sm"
      onChange={onAssistantChange}
      value={value}
      className="w-32 mx-2"
      disabled={loading}
      data={list.map((item) => ({ value: item.id!, label: item.name }))}
    />
  );
};
export default AssistantSelect;
