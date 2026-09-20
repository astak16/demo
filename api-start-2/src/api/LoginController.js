import jsonwebtoken from "jsonwebtoken";
import { JWT_SECRET, AppID } from "@/config";
import { checkCode, generateToken, getJWTPayload, getTempName } from "@/common/Utils";
import UserModel from "@/model/User";
import bcrypt from "bcrypt";
import dayjs from "dayjs";
import { wxGetOpenData, wxGetUserInfo, wxSendMessage } from "@/common/WxUtils";
import SignRecord from "@/model/SignRecord";
import { getValue, delValue } from "@/config/RedisConfig";
import WXBizDataCrypt from "@/common/WXBizDataCrypt";
import { getOauth2AccessToken, getOpenDataByOpenId } from "../common/WxOauth";

const addSign = async (user) => {
  const userObj = user.toJSON();
  const signRecord = await SignRecord.findByUid(userObj._id);
  if (signRecord !== null) {
    if (moment(signRecord.created).format("YYYY-MM-DD") === moment().format("YYYY-MM-DD")) {
      userObj.isSign = true;
    } else {
      userObj.isSign = false;
    }
    userObj.lastSign = signRecord.created;
  } else {
    // 用户无签到记录
    userObj.isSign = false;
  }
  return userObj;
};

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
        const userObj = addSign(user);
        const arr = ["password", "username", "roles"];
        arr.map((item) => {
          delete userObj[item];
        });
        // const token = jsonwebtoken.sign({ _id: userObj._id }, JWT_SECRET, { expiresIn: "1d" });
        const token = generateToken({ _id: userObj._id }, "1d");
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
      token: generateToken({ _id: ctx._id }, "60m"),
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

  // 密码重置
  async reset(ctx) {
    const { body } = ctx.request;
    const sid = body.sid;
    const code = body.code;
    let msg = {};
    // 验证图片验证码的时效性、正确性
    const result = await checkCode(sid, code);
    if (!body.key) {
      ctx.body = {
        code: 500,
        msg: "请求参数异常，请重新获取链接",
      };
      return;
    }
    if (!result) {
      msg.code = ["验证码已经失效，请重新获取！"];
      ctx.body = {
        code: 500,
        msg: msg,
      };
      return;
    }
    const token = await getValue(body.key);
    if (token) {
      const obj = getJWTPayload("Bearer " + token);
      body.password = await bcrypt.hash(body.password, 5);
      await User.updateOne(
        { _id: obj._id },
        {
          password: body.password,
        },
      );
      ctx.body = {
        code: 200,
        msg: "更新用户密码成功！",
      };
    } else {
      ctx.body = {
        code: 500,
        msg: "链接已经失效",
      };
    }
  }

  async wxOauth(ctx) {
    const { body } = ctx.request;
    const { code, state } = body;
    if (code && state) {
      const res = await getOauth2AccessToken(code);
      const { access_token, openid, errcode, errmsg } = res;
      if (errmsg && errcode) {
        ctx.body = { code: 500, msg: errmsg };
        return;
      }
      const user = await UserModel.find({ openid });
      if (user) {
        const userObj = addSign(user);
        const arr = ["password", "username", "roles"];
        arr.map((item) => {
          delete userObj[item];
        });
        // const token = jsonwebtoken.sign({ _id: userObj._id }, JWT_SECRET, { expiresIn: "1d" });
        const token = generateToken({ _id: userObj._id }, "1d");
        ctx.body = {
          code: 200,
          data: userObj,
          token,
          refreshToken: generateToken({ _id: userObj._id }, "7d"),
        };
        return;
      }
      const userInfo = await getOpenDataByOpenId(access_token, openid);
      const newUser = new UserModel({
        openid: userInfo.openid,
        unionid: userInfo.unionid,
        username: getTempName(),
        name: userInfo.nickName,
        roles: ["user"],
        gender: userInfo.sex,
        pic: userInfo.headimgurl,
        location: `${userInfo.country}${userInfo.province}${userInfo.city}`,
      });
      const userTemp = (await newUser.save()).toJSON();
      const token = generateToken({ _id: userTemp._id }, "1d");
      ctx.body = {
        code: 200,
        data: userTemp,
        token,
        refreshToken: generateToken({ _id: userTemp._id }, "7d"),
      };
    }
  }

  async wxLogin(ctx) {
    const { body } = ctx.request;
    const { user, code } = body;
    if (!code) {
      ctx.body = { code: 500, data: "没有足够参数" };
      return;
    }
    const res = await wxGetUserInfo(user, code);
    if (res.errcode === 0) {
      const tmpUser = await UserModel.findOrCreateByUnionid(res);
      const notify = await wxSendMessage({
        touser: tmpUser.openid,
        template_id: "ssss",
        data: {
          phrase1: { value: "登录安全" },
          date2: { value: dayjs().format("YYYY年MM月DD日 HH:mm") },
          thing4: { value: "通过微信授权登录成功，请注意信息安全" },
        },
        miniprogram_state: "developer", // 正式：formal
      });
      const token = generateToken({ _id: tmpUser._id });
      const userInfo = addSign(tmpUser);
      ctx.body = {
        code: 200,
        data: userInfo,
        token,
        refreshToken: generateToken({ _id: userObj._id }, "7d"),
        notify: notify ? notify.data : "",
      };
    } else {
      ctx.throw(501, res.errcode === 50163 ? "code已失效，请刷新后重试" : "获取用户信息失败，请重试 ");
    }
  }

  async getMobile(ctx) {
    const { body } = ctx.request;
    const { code, encryptedData, iv } = body;
    if (!code) {
      ctx.body = { code: 500, data: "没有足够参数" };
      return;
    }
    const { session_key: sessionKey } = await wxGetOpenData(code);
    const wxBizDataCrypt = new WXBizDataCrypt(AppID, sessionKey);
    const data = wxBizDataCrypt.decryptData(encryptedData, iv);
    ctx.body = { code: 200, data, msg: "获取手机号成功" };
  }

  async loginByPhone(ctx) {
    const { body } = ctx.request;
    const { phone, code } = body;
    const sms = await getValue(phone);
    if (sms && sms === code) {
      await delValue(mobile);
      const user = await UserModel.findOrCreateByMobile({ mobile });
      const userObj = await addSign(user);
      ctx.body = {
        code: 200,
        token: generateToken({ _id: userObj._id }),
        data: userObj,
        refreshToken: generateToken({ _id: userObj._id }, "7d"),
      };
    } else {
      code.body = { code: 500, msg: "手机号与验证码不匹配" };
    }
  }
}
export default new LoginController();
