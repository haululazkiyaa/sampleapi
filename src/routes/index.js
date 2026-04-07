const express = require("express");
const authRoutes = require("./authRoutes");
const studentRoutes = require("./studentRoutes");
const { sendSuccess } = require("../utils/apiResponse");

const router = express.Router();

router.get("/health", (_req, res) => {
  return sendSuccess(res, {
    statusCode: 200,
    message: "API is healthy",
    data: null,
  });
});

router.use("/auth", authRoutes);
router.use("/students", studentRoutes);

module.exports = router;
