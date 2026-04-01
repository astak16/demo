// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from "next";

type Data = {
  name: string;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { prompt, history = [], options = {} } = await req.body;

  const data = {
    model: "MiniMax-M2.7",
    messages: [{ role: "system", content: "you are ai assistant" }, ...history, { role: "user", content: prompt }],
    ...options,
  };

  const response = await fetch("https://api.minimaxi.com/v1/text/chatcompletion_v2", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(data),
  });
  const json = await response.json();
  res.status(200).json({ ...json.choices[0].message });
}
