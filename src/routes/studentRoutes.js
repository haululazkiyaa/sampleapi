const express = require("express");
const authenticate = require("../middleware/authMiddleware");
const asyncHandler = require("../middleware/asyncHandler");
const validate = require("../middleware/validate");
const {
  createStudentSchema,
  updateStudentSchema,
  getStudentsQuerySchema,
  updateStudentStatusSchema,
  bulkUpsertStudentSchema,
  analyticsQuerySchema,
} = require("../validators/studentValidator");
const { objectIdParamSchema } = require("../validators/common");
const {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudentStatus,
  bulkUpsertStudents,
  getStudentAnalytics,
  updateStudentById,
  deleteStudentById,
} = require("../controllers/studentController");

const router = express.Router();

router.use(authenticate);

router.get("/", validate(getStudentsQuerySchema), asyncHandler(getAllStudents));
router.post("/", validate(createStudentSchema), asyncHandler(createStudent));
router.get(
  "/analytics",
  validate(analyticsQuerySchema),
  asyncHandler(getStudentAnalytics),
);
router.post(
  "/bulk-upsert",
  validate(bulkUpsertStudentSchema),
  asyncHandler(bulkUpsertStudents),
);
router.patch(
  "/:id/status",
  validate(objectIdParamSchema),
  validate(updateStudentStatusSchema),
  asyncHandler(updateStudentStatus),
);
router.get("/:id", validate(objectIdParamSchema), asyncHandler(getStudentById));
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
