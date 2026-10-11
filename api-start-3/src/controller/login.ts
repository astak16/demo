import { AppContext } from "../../types/types";
import { checkCode } from "../common/Utils";
import UserModel from "../model/user";
import bcrypt from "bcrypt";

export const reg = async (ctx: AppContext) => {
  const { body } = ctx.request;
  const { sid, code, username, password } = body;
  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    typeof sid !== "string" ||
    typeof code !== "string" ||
    !username ||
    !password
  ) {
    ctx.body = { code: 400, msg: "参数错误" };
    return;
  }
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
};

export const login = async (ctx: AppContext) => {
  const { body } = ctx.request;
  const { username, password, sid, code } = body;
  if (
    typeof username !== "string" ||
    typeof password !== "string" ||
    typeof sid !== "string" ||
    typeof code !== "string" ||
    !username ||
    !password
  ) {
    ctx.body = { code: 400, msg: "参数错误" };
    return;
  }

  if (!(await checkCode(sid, code))) {
    ctx.body = { code: 401, msg: "图片验证码不正确，请检查" };
    return;
  }

  let user = await UserModel.findOne({ username });

  const ok = !!user?.password && (await bcrypt.compare(password, user.password));
  if (!user || !ok) {
    ctx.body = { code: 401, msg: "用户名或密码错误" };
    return;
  }

  ctx.body = {
    code: 200,
    data: user,
  };
};
