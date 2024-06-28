const express = require("express");

const router = express.Router();
const {
  login,
  register,
  changePassword,
  fetchStockists,
} = require("../../controllers/userController");
const { protect } = require("../../middleware/authMiddleware");

router.post("/login", login);
router.post("/register", register);
router.put("/changepassword", protect, changePassword);
router.get("/fetch-stockists-for-ledger" , fetchStockists)

module.exports = router;
