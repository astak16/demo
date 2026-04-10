import OpenAI from "openai";
// import { OPENAI_END_POINT } from "./constant";

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  baseURL: `${process.env.OPENAI_END_POINT}/v1/`,
});
