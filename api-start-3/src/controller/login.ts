import { AppContext } from "../../types/types";
import { checkCode } from "../common/Utils";
import UserModel from "../model/user";
import bcrypt from "bcrypt";

export const reg = async (ctx: AppContext) => {
  const { body } = ctx.request;
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
};
