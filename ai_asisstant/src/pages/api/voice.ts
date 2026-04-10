import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { openai } from "@/utils/openai";
import { Uploadable } from "openai/uploads";

export default async function handler(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file") as Uploadable;
  const history = JSON.parse(formData.get("history") as string) as MessageList;
  const options = JSON.parse(formData.get("options") as string);

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
  });

  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: options.prompt || "you are a helpful assistant" },
      ...history,
      { role: "user", content: transcription.text },
    ],
    model: options.model || "gpt-3.5-turbo",
  });

  const audio = await openai.audio.speech.create({
    model: "tts-1",
    voice: "nova",
    input: completion.choices[0].message.content!,
  });

  return new NextResponse(
    JSON.stringify({
      transcription: transcription.text,
      completion: completion.choices[0].message.content,
      audioUrl: Buffer.from(await audio.arrayBuffer()).toString("base64"),
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

export const config = {
  runtime: "edge",
};
