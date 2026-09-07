import svgCaptcha from "svg-captcha";
import { getValue, setValue } from "@/config/RedisConfig";

class PublicController {
  async getCaptcha(ctx) {
    const body = ctx.query;
    const newCaptcha = svgCaptcha.create({
      size: 4,
      ignoreChars: "0oO1ilLI",
      color: true,
      noise: Math.floor(Math.random() * 5),
      width: 150,
      height: 38,
    });

    setValue(body.sid, newCaptcha.text, 10 * 60);
    console.log("图片验证码:", newCaptcha.text);
    ctx.body = {
      code: 200,
      // data: newCaptcha.data,
      data: newCaptcha.text,
    };
  }
}

export default new PublicController();
