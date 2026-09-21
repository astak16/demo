import { adminEmail } from "../config/index.ts";
import User from "../model/User.ts";
import { setValue } from "../config/RedisConfig.ts";

export const init = async () => {
  if (adminEmail && adminEmail.length > 0) {
    const emails = adminEmail;
    const arr = [];
    for (let email of emails) {
      const user = await User.findOne({ username: email });
      if (user) {
        arr.push(user._id.toString());
      }
    }
    setValue("admin", JSON.stringify(arr));
  }
};
