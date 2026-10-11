import { delValue, getValue } from "../config/redisConfig";

export const checkCode = async (key: string, value: string): Promise<boolean> => {
  const redisValue = await getValue(key);
  // delValue(key);
  if (typeof redisValue === "string") {
    const isBoolean = redisValue.toLocaleLowerCase() === value.toLocaleLowerCase();
    return isBoolean;
  } else {
    return false;
  }
};
