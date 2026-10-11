import svgCaptcha from "svg-captcha";
import { randomUUID } from "node:crypto";
import { setValue } from "../config/redisConfig";
import { AppContext } from "../../types/types";

export const getCaptcha = (ctx: AppContext) => {
  const newCaptcha = svgCaptcha.create({
    size: 4,
    ignoreChars: "0oO1ilLI",
    color: true,
    noise: Math.floor(Math.random() * 5),
    width: 150,
    height: 38,
  });
  const id = randomUUID();
  setValue(id, newCaptcha.text, 10 * 60);
  console.log("图片验证码:", newCaptcha.text);
  ctx.body = {
    code: 200,
    // data: newCaptcha.data,
    data: { text: newCaptcha.text, sid: id },
  };
};
