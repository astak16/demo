import mongoose, { Schema } from "mongoose";

const TestSchema = new Schema({ name: { type: String }, value: { type: String } });

const TestModel = mongoose.model("tests", TestSchema);

export default TestModel;
