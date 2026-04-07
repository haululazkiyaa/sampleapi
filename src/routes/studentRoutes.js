const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const asyncHandler = require("../middleware/asyncHandler");
const validate = require("../middleware/validate");
const {
  createStudentSchema,
  updateStudentSchema,
  getStudentsQuerySchema,
} = require("../validators/studentValidator");
const { objectIdParamSchema } = require("../validators/common");
const {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudentById,
  deleteStudentById,
} = require("../controllers/studentController");

const router = express.Router();

router.use(authenticate);

router.get("/", validate(getStudentsQuerySchema), asyncHandler(getAllStudents));
router.get("/:id", validate(objectIdParamSchema), asyncHandler(getStudentById));
router.post("/", validate(createStudentSchema), asyncHandler(createStudent));
router.put(
  "/:id",
  validate(objectIdParamSchema),
  validate(updateStudentSchema),
  asyncHandler(updateStudentById),
);
router.delete(
  "/:id",
  validate(objectIdParamSchema),
  asyncHandler(deleteStudentById),
);

module.exports = router;
