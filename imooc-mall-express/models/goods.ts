import { model, Schema } from "mongoose";

export interface Good {
  productId?: string;
  productName?: string;
  salePrice?: number;
  productImage?: string;
  productUrl?: string;
  productNum?: number;
  checked?: string | number;
}

const goodsSchema = new Schema<Good>({
  productId: String,
  productName: String,
  salePrice: Number,
  productImage: String,
  productUrl: String,
  productNum: Number,
  checked: Schema.Types.Mixed,
});

const Goods = model<Good>("good", goodsSchema);

export default Goods;
