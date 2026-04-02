import { ChangeEvent, FormEvent, useState } from "react";
import { Button, Input, NumberInput, Textarea } from "@mantine/core";
import { IconDeviceFloppy, IconTrash } from "@tabler/icons-react";

const { Wrapper } = Input;

type Props = {
  assistant: EditAssistant;
  save: (data: EditAssistant) => void;
  remove: (id: string) => void;
};

const AssistantConfig = ({ assistant, save, remove }: Props) => {
  const [data, setData] = useState<EditAssistant>(assistant);
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    save(data);
  };

  const onChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setData({ ...data, [name]: value });
  };

  const onNumberChange = (value: number | string, name: string) => {
    if (value === "") return;
    setData({ ...data, [name]: value });
  };

  return (
    <div className="w-full flex justify-center">
      <form className="w-full flex flex-col gap-4" onSubmit={onSubmit}>
        <Wrapper label="名称" description="助理名称">
          <Input type="text" variant="filled" value={data.name} name="name" onChange={onChange} />
        </Wrapper>
        <Wrapper label="指令" description="为角色分配的系统指令">
          <Textarea
            variant="filled"
            className="w-full"
            value={data.prompt}
            name="prompt"
            onChange={onChange}
            autosize
          />
        </Wrapper>
        <Wrapper label="创意度" description="回复的创意度，数值越大，创意度越高" variant="filled">
          <NumberInput
            type="number"
            variant="filled"
            precision={1}
            max={2}
            min={0}
            step={0.1}
            value={data.temperature}
            name="temperature"
            onChange={(value) => onNumberChange(value, "temperature")}
          />
        </Wrapper>
        <Wrapper label="上下文数" description="每次对话记忆的历史对话次数">
          <NumberInput
            type="number"
            variant="filled"
            max={8}
            min={0}
            step={1}
            value={data.max_log}
            name="max_log"
            onChange={(value) => onNumberChange(value, "max_log")}
          />
        </Wrapper>
        <Wrapper label="回复长度" description="回复内容的长度限制">
          <NumberInput
            type="number"
            variant="filled"
            max={2000}
            min={50}
            step={50}
            value={data.max_tokens}
            name="max_tokens"
            onChange={(value) => onNumberChange(value, "max_tokens")}
          />
        </Wrapper>
        <div className="flex justify-around mt-4">
          <Button type="submit" leftIcon={<IconDeviceFloppy size="1.2rem" />}>
            Save
          </Button>
          {data.id ? (
            <Button
              color="red"
              variant="light"
              leftIcon={<IconTrash size="1.2rem" />}
              onClick={() => remove(data.id as string)}>
              Remove
            </Button>
          ) : null}
        </div>
      </form>
    </div>
  );
};

export default AssistantConfig;
