import jsonwebtoken from "jsonwebtoken";
import { JWT_SECRET } from "@/config";
import { checkCode, generateToken } from "@/common/Utils";
import UserModel from "@/model/User";
import bcrypt from "bcrypt";
import dayjs from "dayjs";
class LoginController {
  async forget(ctx) {}

  async login(ctx) {
    const { body } = ctx.request;
    let sid = body.sid;
    let code = body.code;

    if (await checkCode(sid, code)) {
      let checkUserPassword = false;
      let user = await UserModel.findOne({ username: body.username });
      // if (user && user.password === body.password) {
      //   checkUserPassword = true;
      // }
      if (user && (await bcrypt.compare(body.password, user.password))) {
        checkUserPassword = true;
      }
      if (checkUserPassword) {
        const userObj = user.toJSON();
        const arr = ["password", "username", "roles"];
        arr.map((item) => {
          delete userObj[item];
        });
        // const token = jsonwebtoken.sign({ _id: userObj._id }, JWT_SECRET, { expiresIn: "1d" });
        const token = generateToken({ _id: userObj._id }, "1m");
        ctx.body = {
          code: 200,
          data: userObj,
          token,
          refreshToken: generateToken({ _id: userObj._id }, "7d"),
        };
      } else {
        ctx.body = {
          code: 404,
          msg: "用户名或者密码错误",
        };
      }
    } else {
      ctx.body = {
        code: 401,
        msg: "图片验证码不正确，请检查",
      };
    }
  }

  async refresh(ctx) {
    ctx.body = {
      code: 200,
      token: generateToken({ _id: ctx._id }),
      msg: "获取 token 成功",
    };
  }

  async reg(ctx) {
    const { body } = ctx.request;
    const sid = body.sid;
    const code = body.code;
    let msg = {};
    let check = true;
    if (await checkCode(sid, code)) {
      let user1 = await UserModel.findOne({ username: body.username });
      if (user1 && typeof user1.username !== "undefined") {
        msg.username = ["此邮箱已经注册，可通过邮箱找回密码"];
        check = false;
      }

      let user2 = await UserModel.findOne({ name: body.name });
      if (user2 && typeof user2.name !== "undefined") {
        msg.name = ["此昵称已经被占用，请更换"];
        check = false;
      }
      if (check) {
        body.password = await bcrypt.hash(body.password, 5);
        let user = new UserModel({
          username: body.username,
          name: body.name,
          password: body.password,
          createdAt: dayjs().format("YYYY-MM-DD HH:mm:ss"),
        });
        const result = await user.save();
        ctx.body = {
          code: 200,
          data: result,
          msg: "注册成功",
        };
        return;
      }
    } else {
      msg.code = ["验证码已经失效，请重新获取！"];
    }
    ctx.body = {
      code: 500,
      msg,
    };
  }
}
export default new LoginController();
