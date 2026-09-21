import mongoose from "../config/DBHelpler.ts";

const Schema = mongoose.Schema;

const ErrorRecordSchema = new Schema({
  message: { type: String, default: "" },
  code: { type: String, default: "" },
  method: { type: String, default: "" },
  path: { type: String, default: "" },
  param: { type: Schema.Types.Mixed, default: "" },
  username: { type: String, default: "" },
  stack: { type: String, default: "" },
  created: { type: Date },
});

ErrorRecordSchema.pre("save", function () {
  this.created = new Date();
});

const ErrorRecord = mongoose.model("error_record", ErrorRecordSchema);

export default ErrorRecord;
