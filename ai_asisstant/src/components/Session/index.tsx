import { useEffect, useState } from "react";
import * as chatStorage from "@/utils/chatStorage";
import { useMantineColorScheme, ActionIcon } from "@mantine/core";
import clsx from "clsx";
import { IconMessagePlus, IconTrash } from "@tabler/icons-react";
import { EditTableText } from "../EdittableText";

type Props = {
  sessionId: string;
  onChange: (arg: string) => void;
};

const itemBaseClasses = "flex cursor-pointer h-[2.4rem] items-center justify-around group px-4 rounded-md";

const generateItemClasses = (id: string, sessionId: string, colorScheme: string) =>
  clsx(itemBaseClasses, {
    "hover:bg-gray-300/60": colorScheme === "light",
    "bg-gray-200/60": id !== sessionId && colorScheme === "light",
    "bg-gray-300": id === sessionId && colorScheme === "light",
    "hover:bg-zinc-800/50": colorScheme === "dark",
    "bg-zinc-800/20": id !== sessionId && colorScheme === "dark",
    "bg-zinc-800/90": id === sessionId && colorScheme === "dark",
  });

const Session = ({ sessionId, onChange }: Props) => {
  const [sessionList, setSessionList] = useState<SessionList>([]);
  const { colorScheme } = useMantineColorScheme();

  useEffect(() => {
    const list = chatStorage.getSessionStore();
    setSessionList(list);
  }, []);

  const onSelect = (id: string) => {
    onChange(id);
  };

  const createSession = () => {
    const newSession = {
      name: `session-${sessionList.length + 1}`,
      id: Date.now().toString(),
    };
    onChange(newSession.id);
    const list = chatStorage.addSession(newSession);
    setSessionList(list);
  };

  const removeSession = (id: string) => {
    let list = chatStorage.removeSession(id);
    if (id === sessionId) {
      onChange(list[0]?.id || "");
    }
    setSessionList(list);
  };

  const updateSession = (name: string) => {
    const newSessionList = chatStorage.updateSession(sessionId, { name });
    setSessionList(newSessionList);
  };

  return (
    <div
      className={clsx(
        { "bg-black/10": colorScheme === "dark", "bg-gray-100": colorScheme === "light" },
        "h-screen",
        "w-64",
        "flex",
        "flex-col",
        "px-2",
      )}>
      <div className="flex justify-between py-2 w-full">
        <ActionIcon onClick={createSession} size="sm" color="green">
          <IconMessagePlus size="1rem" />
        </ActionIcon>
      </div>
      <div className={clsx(["pb-4", "overflow-auto", "scrollbar-none", "flex", "flex-col", "gap-y-2"])}>
        {sessionList.map(({ id, name }) => (
          <div key={id} onClick={() => onChange(id)} className={generateItemClasses(id, sessionId, colorScheme)}>
            <EditTableText text={name} onSave={(name) => updateSession(name)} />
            {sessionList.length > 1 ? (
              <IconTrash
                className="mx-1 invisible group-hover:visible"
                size=".8rem"
                color="gray"
                onClick={(evt) => {
                  evt.stopPropagation();
                  removeSession(id);
                }}
              />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Session;
