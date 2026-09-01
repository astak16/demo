import { model, Schema } from "mongoose";

export interface CartItem {
  productId?: string;
  productName?: string;
  salePrice?: number;
  productImage?: string;
  checked?: string | number;
  productNum: number;
}

interface Address {
  addressId?: string;
  userName?: string;
  streetName?: string;
  postCode?: number;
  tel?: number;
  isDefault?: boolean;
}

interface User {
  userId?: string;
  userName?: string;
  userPwd?: string;
  orderList: unknown[];
  cartList: CartItem[];
  addressList: Address[];
}

const cartItemSchema = new Schema<CartItem>(
  {
    productId: String,
    productName: String,
    salePrice: Number,
    productImage: String,
    checked: Schema.Types.Mixed,
    productNum: { type: Number, default: 0 },
  },
  { _id: false },
);

const addressSchema = new Schema<Address>(
  {
    addressId: String,
    userName: String,
    streetName: String,
    postCode: Number,
    tel: Number,
    isDefault: Boolean,
  },
  { _id: false },
);

const userSchema = new Schema<User>({
  userId: String,
  userName: String,
  userPwd: String,
  orderList: { type: [Schema.Types.Mixed], default: [] },
  cartList: { type: [cartItemSchema], default: [] },
  addressList: { type: [addressSchema], default: [] },
});

const Users = model<User>("user", userSchema);

export default Users;
