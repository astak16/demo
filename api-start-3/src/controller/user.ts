import { generateToken } from "../common/Utils";
import { withBody } from "../common/Validate";
import { send } from "../config/MailConfig";
import { setValue } from "../config/redisConfig";
import { UpdateBasicInfoSchema } from "../dto/user";
import UserModel from "../model/user";
import { v4 as uuidv4 } from "uuid";
import dayjs from "dayjs";

export const basic = withBody(UpdateBasicInfoSchema, async (ctx, body) => {
  const { username } = body;
  const user = await UserModel.findOne({ _id: ctx.state.user?._id });
  let msg = "";
  if (username && user && username !== user.username) {
    const tmpUser = await UserModel.findOne({ username });
    if (tmpUser && tmpUser.password) {
      ctx.body = { code: 500, msg: "用户名已存在，请重新输入！" };
      return;
    }
    const key = uuidv4();
    setValue(key, generateToken({ _id: user._id.toString() }, "30m"));
    await send({
      type: "email",
      data: { username },
      expire: dayjs().add(30, "minutes").format("YYYY-MM-DD HH:mm:ss"),
      email: username,
      user: user?.name ? user.name : username,
    });
    msg = "更新基本资料成功，账号修改需要邮件确认，请查收邮件！";
  }
  const result = await UserModel.updateOne({ _id: user?._id.toString() }, body);
  if (result.matchedCount === 1) {
    ctx.body = { code: 200, msg: msg === "" ? "更新基本资料成功" : msg };
  } else {
    ctx.body = { code: 500, msg: "更新基本资料失败" };
  }
});
