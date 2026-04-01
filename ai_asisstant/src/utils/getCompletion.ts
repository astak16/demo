type Props = { prompt: string; history?: ChatLogType[]; options?: { temperature?: number; max_token?: number } };

export const getCompletion = async (params: Props) => {
  const resp = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  if (!resp.ok) {
    throw new Error(`API error: ${resp.statusText}`);
  }
  const data = await resp.json();
  return data;
};
