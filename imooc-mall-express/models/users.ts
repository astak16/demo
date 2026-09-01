import { model, Schema } from "mongoose";

export interface CartItem {
  productId?: string;
  productName?: string;
  salePrice?: number;
  productImage?: string;
  checked?: string | number;
  productNum: number;
}

export interface Address {
  addressId?: string;
  userName?: string;
  streetName?: string;
  postCode?: number;
  tel?: number;
  isDefault?: boolean;
}

export interface Order {
  orderId: string;
  orderTotal: number;
  addressInfo: Address;
  goodsList: CartItem[];
  orderStatus: string;
  createDate: string;
}

export interface User {
  userId?: string;
  userName?: string;
  userPwd?: string;
  orderList: Order[];
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

const orderSchema = new Schema<Order>(
  {
    orderId: String,
    orderTotal: Number,
    addressInfo: addressSchema,
    goodsList: { type: [cartItemSchema], default: [] },
    orderStatus: String,
    createDate: String,
  },
  { _id: false },
);

const userSchema = new Schema<User>({
  userId: String,
  userName: String,
  userPwd: String,
  orderList: { type: [orderSchema], default: [] },
  cartList: { type: [cartItemSchema], default: [] },
  addressList: { type: [addressSchema], default: [] },
});

const Users = model<User>("user", userSchema);

export default Users;
