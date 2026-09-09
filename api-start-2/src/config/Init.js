import { adminEmail } from "@/config";
import User from "@/model/User";
import { setValue } from "@/config/RedisConfig";

export const init = async () => {
  if (adminEmail && adminEmail.length > 0) {
    const emails = adminEmail;
    const arr = [];
    for (let email of emails) {
      const user = await User.findOne({ username: email });
      arr.push(user._id);
    }
    setValue("admin", JSON.stringify(arr));
  }
};
