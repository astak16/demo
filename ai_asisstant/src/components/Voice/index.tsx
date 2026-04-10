import { ActionIcon } from "@mantine/core";
import { IconCircle, IconLoader2, IconMicrophone, IconPointer } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
// @ts-ignore
import MicroRecorder from "mic-recorder-to-mp3";
import * as chatStorage from "@/utils/chatStorage";

const Mp3Recorder = new MicroRecorder({ bitRate: 128 });

export default function Voice({ sessionId, assistant }: { sessionId: string; assistant: Assistant }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isGranted, setIsGranted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const isDisabled = useMemo(() => isLoading || !isGranted || isPlaying, [isLoading, isGranted, isPlaying]);

  useEffect(() => {
    (navigation as any).getUserMedia(
      { audio: true },
      () => setIsGranted(true),
      () => setIsGranted(false),
    );
  }, []);

  const start = () => {
    Mp3Recorder.start().then(() => {
      setIsRecording(true);
    });
  };

  const end = () => {
    Mp3Recorder.stop()
      .getMp3()
      .then(([buffer, blob]: any) => {
        const file = new File(buffer, "voice.mp3", {
          type: blob.type,
          lastModified: Date.now(),
        });
        const player = new Audio(URL.createObjectURL(file));
        player.play();
        setIsPlaying(true);
        player.onended = () => {
          setIsPlaying(false);
          answer(blob);
        };
      });

    setIsRecording(false);
  };

  const updateMessage = (msg: MessageList) => {
    const list = chatStorage.getMessage(sessionId);
    chatStorage.updateMessage(sessionId, [...list, ...msg]);
  };

  const answer = async (blob: Blob) => {
    setIsLoading(true);
    let history = chatStorage.getMessage(sessionId);
    let options = assistant;
    const formData = new FormData();
    formData.append("file", blob);
    formData.append("history", JSON.stringify(history.slice(-assistant.max_log)));
    formData.append("options", JSON.stringify(options));
    const resp = await fetch("/api/voice", { method: "POST", body: formData });
    const { audio, transcription, completion } = await resp.json();
    setIsLoading(false);
    updateMessage([
      { role: "user", content: transcription },
      { role: "assistant", content: completion },
    ]);
    const audioElement = new Audio(`data:audio/wav;base64,${audio}`);
    audioElement.addEventListener("ended", () => {
      setIsPlaying(false);
    });
    audioElement.addEventListener("play", () => {
      setIsPlaying(true);
    });
    audioElement.play();
  };
  return (
    <div className="w-full h-full flex flex-col items-center justify-center">
      {isLoading ? (
        <div className="flex item-center">
          <IconLoader2 size="1rem" className="animate-spin mr-2" />
          loading
        </div>
      ) : isPlaying ? (
        <div className="flex item-center">
          <IconCircle size="1rem" className="animate-ping mr-2" />
          playing
        </div>
      ) : (
        <div className="text-gray-600 flex items-center">
          <IconPointer size="1rem" className="mr-2" />
          Hold to ask
        </div>
      )}
      <ActionIcon className="mt-4" size="4rem" disabled={isDisabled} onMouseDown={start} onMouseUp={end}>
        <IconMicrophone color={isRecording ? "red" : "green"} />
      </ActionIcon>
    </div>
  );
}
