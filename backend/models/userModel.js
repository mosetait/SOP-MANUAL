const { required } = require("joi");
const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 191,
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 191,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
  },
  password: {
    type: String,
    required: true,
  },

  type: {
    type: String,
    enum: ["stockist" , "admin"],
    required: true,
    default: "stockist"
  },


  ledgers: {
    type : [Object]
  }

  
});

module.exports = mongoose.model("User", userSchema);
