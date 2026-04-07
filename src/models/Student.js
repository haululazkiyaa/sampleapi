const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
  {
    nim: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 5,
      maxlength: 30,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 255,
    },
    major: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    semester: {
      type: Number,
      required: true,
      min: 1,
      max: 14,
    },
    gpa: {
      type: Number,
      min: 0,
      max: 4,
      default: 0,
    },
    birthDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

module.exports = mongoose.model("Student", studentSchema);
