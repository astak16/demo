// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
// import { createParser, ParserEvent, ReconnectInterval } from "eventsource-parser";
import { createParser, ParsedEvent, ReconnectInterval } from "eventsource-parser";

import type { NextRequest } from "next/server";

type StreamPayload = {
  model: string;
  messages: MessageList;
  temperature?: number;
  stream: boolean;
  max_tokens?: number;
};

export default async function handler(req: NextRequest) {
  const { prompt, history = [], options = {} } = await req.json();
  const { max_tokens, temperature } = options;

  const data = {
    model: "MiniMax-M2.7",
    stream: true,
    messages: [{ role: "system", content: options.prompt }, ...history, { role: "user", content: prompt }],
    max_tokens: +max_tokens || 1000,
    temperature: +temperature || 0.7,
  };
  const stream = await requestStream(data);
  return new Response(stream);

  // const response = await fetch("https://api.minimaxi.com/v1/text/chatcompletion_v2", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  //   },
  //   body: JSON.stringify(data),
  // });
  // const json = await response.json();
  // res.status(200).json({ ...json.choices[0].message });
}

async function requestStream(payload: StreamPayload) {
  // const { prompt, history = [], options = {} } = await req.body;

  // const data = {
  //   model: "MiniMax-M2.7",
  //   messages: [{ role: "system", content: "you are ai assistant" }, ...history, { role: "user", content: prompt }],
  //   ...options,
  // };
  let counter = 0;
  const response = await fetch("https://api.minimaxi.com/v1/text/chatcompletion_v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });
  if (response.status !== 200) {
    return response.body;
  }
  return createStream(response, counter);
}

const createStream = (response: Response, counter: number) => {
  const decoder = new TextDecoder("utf-8");
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === "event") {
          const data = event.data;
          if (data === "[DONE]") {
            controller.close();
            return;
          }
          try {
            const json = JSON.parse(data);
            const text = json.choices[0].delta?.content || "";
            if (counter < 2 && (text.match(/\n/) || []).length) {
              return;
            }
            const q = encoder.encode(text);
            controller.enqueue(q);
            counter++;
          } catch (e) {
            controller.error(e);
          }
        }
      };

      const parser = createParser(onParse);
      for await (const chunk of response.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });
};

export const config = {
  runtime: "edge",
};
