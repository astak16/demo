import { checkCode, generateToken, getJWTPayload } from "../common/Utils";
import { withBody } from "../common/Validate";
import { RegSchema, LoginSchema, ForgetPasswordSchema, ResetPasswordSchema } from "../dto/login";
import UserModel from "../model/user";
import bcrypt from "bcrypt";
import { send } from "../config/MailConfig";
import dayjs from "dayjs";
import logger from "../config/logger";
import { getValue, setValue } from "../config/redisConfig";
import { v4 as uuidv4 } from "uuid";

export const reg = withBody(RegSchema, async (ctx, body) => {
  const { sid, code, username, password } = body;

  let msg = {};
  let check = true;
  if (await checkCode(sid, code)) {
    if (await UserModel.exists({ username })) {
      msg = { ...msg, username: ["用户名已存在，请重新输入！"] };
      check = false;
    }

    if (check) {
      const pwdSc = await bcrypt.hash(password, 5);
      let user = new UserModel({ username, password: pwdSc });
      const result = await user.save();
      ctx.body = {
        code: 200,
        data: result,
        msg: "注册成功",
      };
      return;
    }
  } else {
    msg = { ...msg, code: ["验证码已经失效，请重新获取！"] };
  }
  ctx.body = { code: 500, msg };
});

export const login = withBody(LoginSchema, async (ctx, body) => {
  const { username, password, sid, code } = body;

  if (!(await checkCode(sid, code))) {
    ctx.body = { code: 500, msg: "图片验证码不正确，请检查" };
    return;
  }

  let user = await UserModel.findOne({ username });

  const ok = !!user?.password && (await bcrypt.compare(password, user.password));
  if (!user || !ok) {
    ctx.body = { code: 401, msg: "用户名或密码错误" };
    return;
  }
  const token = generateToken({ _id: user._id.toString() }, "1d");

  ctx.body = {
    code: 200,
    data: { ...user.toJSON(), token },
  };
});

export const forget = withBody(ForgetPasswordSchema, async (ctx, body) => {
  const { username } = body;
  const user = await UserModel.findOne({ username });
  if (!user) {
    ctx.body = { code: 500, msg: "用户名不存在" };
    return;
  }
  const key = uuidv4();
  setValue(key, generateToken({ _id: user._id.toString() }, "30m"), 30 * 60);
  try {
    const result = await send({
      type: "reset",
      data: { username },
      expire: dayjs().add(30, "minutes").format("YYYY-MM-DD HH:mm:ss"),
      email: username,
      user: user.name ? user.name : username,
    });
    ctx.body = {
      code: 200,
      data: { key, result },
      msg: "邮件发送成功",
    };
  } catch (e) {
    logger.error({ e }, "邮件发送失败");
    ctx.body = {
      code: 500,
      msg: "邮件发送失败",
    };
  }
});

export const reset = withBody(ResetPasswordSchema, async (ctx, body) => {
  const { sid, code, key, password: pwd } = body;

  if (!(await checkCode(sid, code))) {
    ctx.body = { code: 500, msg: "验证码不正确，请检查" };
    return;
  }
  if (!key) {
    ctx.body = { code: 500, msg: "请求参数异常，请重新获取链接" };
    return;
  }
  const token = await getValue(key);
  if (!token) {
    ctx.body = { code: 500, msg: "链接已经失效" };
    return;
  }
  const obj = getJWTPayload("Bearer " + token);
  const password = await bcrypt.hash(pwd, 5);
  const user = await UserModel.findByIdAndUpdate(obj._id, { password }, { new: true });
  if (!user) {
    ctx.body = { code: 500, msg: "用户不存在" };
    return;
  }
  ctx.body = {
    code: 200,
    msg: "密码重置成功",
  };
});
