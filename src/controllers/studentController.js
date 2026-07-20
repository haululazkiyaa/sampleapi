const mongoose = require("mongoose");
const Student = require("../models/Student");
const { studentFieldsSchema } = require("../validators/studentValidator");
const ApiError = require("../utils/apiError");
const { sendSuccess } = require("../utils/apiResponse");

const STATUS_TRANSITIONS = {
  active: ["inactive", "graduated", "dropped_out"],
  inactive: ["active", "dropped_out"],
  graduated: [],
  dropped_out: [],
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeStudentPayload(value) {
  return {
    ...value,
    birthDate: value.birthDate ? new Date(value.birthDate) : undefined,
  };
}

function duplicateField(error) {
  return Object.keys(error.keyPattern || {})[0] || "field";
}

function zodIssues(error, prefix = "") {
  return error.issues.map((issue) => ({
    field: [prefix, ...issue.path].filter(Boolean).join("."),
    message: issue.message,
  }));
}

function buildStudentFilter(query) {
  const { search, major, status, semester, gpaMin, gpaMax } = query;
  const filter = {};

  if (search) {
    const expression = new RegExp(escapeRegex(search), "i");
    filter.$or = ["name", "nim", "email", "major"].map((field) => ({
      [field]: expression,
    }));
  }
  if (major) filter.major = new RegExp(`^${escapeRegex(major)}$`, "i");
  if (status) filter.status = status;
  if (semester !== undefined) filter.semester = semester;
  if (gpaMin !== undefined || gpaMax !== undefined) {
    filter.gpa = {};
    if (gpaMin !== undefined) filter.gpa.$gte = gpaMin;
    if (gpaMax !== undefined) filter.gpa.$lte = gpaMax;
  }

  return filter;
}

async function getAllStudents(req, res) {
  const { page, limit, sortBy, sortOrder } = req.query;
  const filter = buildStudentFilter(req.query);
  const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1, _id: 1 };
  const skip = (page - 1) * limit;

  const [students, totalItems] = await Promise.all([
    Student.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    Student.countDocuments(filter),
  ]);

  const totalPages = Math.ceil(totalItems / limit) || 1;

  return sendSuccess(res, {
    statusCode: 200,
    message: "Students fetched successfully",
    data: students,
    meta: {
      page,
      limit,
      totalItems,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  });
}

async function getStudentById(req, res, next) {
  const student = await Student.findById(req.params.id).lean();
  if (!student) return next(new ApiError(404, "Student not found"));

  return sendSuccess(res, {
    statusCode: 200,
    message: "Student fetched successfully",
    data: student,
  });
}

async function createStudent(req, res, next) {
  try {
    const student = await Student.create(normalizeStudentPayload(req.body));
    return sendSuccess(res, {
      statusCode: 201,
      message: "Student created successfully",
      data: student,
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(409, `Duplicate value for ${duplicateField(error)}`));
    }
    return next(error);
  }
}

async function updateStudentStatus(req, res, next) {
  const student = await Student.findById(req.params.id);
  if (!student) return next(new ApiError(404, "Student not found"));

  const previousStatus = student.status;
  const { status, reason } = req.body;

  if (status === previousStatus) {
    return next(new ApiError(409, `Student status is already ${status}`));
  }
  if (!STATUS_TRANSITIONS[previousStatus].includes(status)) {
    return next(
      new ApiError(409, `Status cannot transition from ${previousStatus} to ${status}`),
    );
  }

  student.status = status;
  student.statusReason = reason;
  await student.save();

  return sendSuccess(res, {
    message: "Student status updated successfully",
    data: {
      id: student._id,
      previousStatus,
      status: student.status,
      reason: student.statusReason || null,
      updatedAt: student.updatedAt,
    },
  });
}

async function processBulkItem(rawStudent, matchBy, session) {
  const parsed = studentFieldsSchema.safeParse(rawStudent);
  if (!parsed.success) return { validationError: parsed.error };

  const payload = normalizeStudentPayload(parsed.data);
  const lookup = { [matchBy]: payload[matchBy] };
  const existing = await Student.findOne(lookup).session(session || null).lean();
  const student = await Student.findOneAndUpdate(lookup, payload, {
    new: true,
    upsert: true,
    runValidators: true,
    setDefaultsOnInsert: true,
    session,
  });

  return { student, operation: existing ? "updated" : "created" };
}

async function bulkUpsertStudents(req, res, next) {
  const { matchBy, mode, students } = req.body;

  if (mode === "atomic") {
    const invalidItems = students.flatMap((student, index) => {
      const parsed = studentFieldsSchema.safeParse(student);
      return parsed.success ? [] : zodIssues(parsed.error, `body.students.${index}`);
    });
    if (invalidItems.length > 0) {
      return next(new ApiError(422, "Bulk validation failed", invalidItems));
    }

    const values = students.map((student) => student[matchBy].toLowerCase());
    if (new Set(values).size !== values.length) {
      return next(new ApiError(409, `Duplicate ${matchBy} values in request`));
    }

    const session = await mongoose.startSession();
    const results = [];
    try {
      await session.withTransaction(async () => {
        results.length = 0;
        for (let index = 0; index < students.length; index += 1) {
          const result = await processBulkItem(students[index], matchBy, session);
          results.push({
            index,
            status: result.operation,
            studentId: result.student._id,
          });
        }
      });
    } catch (error) {
      if (error.code === 11000) {
        return next(
          new ApiError(409, `Duplicate value for ${duplicateField(error)}`),
        );
      }
      return next(error);
    } finally {
      await session.endSession();
    }

    return sendSuccess(res, {
      message: "Atomic bulk operation completed",
      data: {
        summary: {
          received: students.length,
          created: results.filter((item) => item.status === "created").length,
          updated: results.filter((item) => item.status === "updated").length,
          failed: 0,
        },
        results,
      },
    });
  }

  const results = [];
  for (let index = 0; index < students.length; index += 1) {
    try {
      const result = await processBulkItem(students[index], matchBy);
      if (result.validationError) {
        results.push({
          index,
          status: "failed",
          errors: zodIssues(result.validationError),
        });
      } else {
        results.push({
          index,
          status: result.operation,
          studentId: result.student._id,
        });
      }
    } catch (error) {
      if (error.code === 11000) {
        results.push({
          index,
          status: "failed",
          errors: [
            {
              field: duplicateField(error),
              message: `Duplicate value for ${duplicateField(error)}`,
            },
          ],
        });
      } else {
        return next(error);
      }
    }
  }

  return sendSuccess(res, {
    message: "Partial bulk operation completed",
    data: {
      summary: {
        received: students.length,
        created: results.filter((item) => item.status === "created").length,
        updated: results.filter((item) => item.status === "updated").length,
        failed: results.filter((item) => item.status === "failed").length,
      },
      results,
    },
  });
}

async function getStudentAnalytics(req, res) {
  const {
    major,
    status,
    semesterFrom,
    semesterTo,
    gpaMin,
    gpaMax,
    groupBy,
  } = req.query;
  const match = {};

  if (major) match.major = new RegExp(`^${escapeRegex(major)}$`, "i");
  if (status) match.status = status;
  if (semesterFrom !== undefined || semesterTo !== undefined) {
    match.semester = {};
    if (semesterFrom !== undefined) match.semester.$gte = semesterFrom;
    if (semesterTo !== undefined) match.semester.$lte = semesterTo;
  }
  if (gpaMin !== undefined || gpaMax !== undefined) {
    match.gpa = {};
    if (gpaMin !== undefined) match.gpa.$gte = gpaMin;
    if (gpaMax !== undefined) match.gpa.$lte = gpaMax;
  }

  const [analytics] = await Student.aggregate([
    { $match: match },
    {
      $facet: {
        summary: [
          {
            $group: {
              _id: null,
              totalStudents: { $sum: 1 },
              averageGpa: { $avg: "$gpa" },
              highestGpa: { $max: "$gpa" },
              lowestGpa: { $min: "$gpa" },
            },
          },
          { $project: { _id: 0 } },
        ],
        distribution: [
          {
            $group: {
              _id: `$${groupBy}`,
              studentCount: { $sum: 1 },
              averageGpa: { $avg: "$gpa" },
            },
          },
          { $sort: { _id: 1 } },
          {
            $project: {
              _id: 0,
              key: "$_id",
              studentCount: 1,
              averageGpa: { $round: ["$averageGpa", 2] },
            },
          },
        ],
        statusBreakdown: [
          { $group: { _id: "$status", count: { $sum: 1 } } },
          { $project: { _id: 0, status: "$_id", count: 1 } },
        ],
      },
    },
  ]);

  const summary = analytics.summary[0] || {
    totalStudents: 0,
    averageGpa: null,
    highestGpa: null,
    lowestGpa: null,
  };
  if (summary.averageGpa !== null) {
    summary.averageGpa = Math.round(summary.averageGpa * 100) / 100;
  }

  return sendSuccess(res, {
    message: "Student analytics fetched successfully",
    data: {
      summary,
      distribution: analytics.distribution,
      statusBreakdown: Object.fromEntries(
        analytics.statusBreakdown.map((item) => [item.status, item.count]),
      ),
    },
    meta: {
      filters: { major, status, semesterFrom, semesterTo, gpaMin, gpaMax },
      groupBy,
    },
  });
}

async function updateStudentById(req, res, next) {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      normalizeStudentPayload(req.body),
      { new: true, runValidators: true },
    ).lean();
    if (!student) return next(new ApiError(404, "Student not found"));

    return sendSuccess(res, {
      message: "Student updated successfully",
      data: student,
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ApiError(409, `Duplicate value for ${duplicateField(error)}`));
    }
    return next(error);
  }
}

async function deleteStudentById(req, res, next) {
  const student = await Student.findByIdAndDelete(req.params.id).lean();
  if (!student) return next(new ApiError(404, "Student not found"));

  return sendSuccess(res, {
    message: "Student deleted successfully",
    data: { id: student._id },
  });
}

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudentStatus,
  bulkUpsertStudents,
  getStudentAnalytics,
  updateStudentById,
  deleteStudentById,
};
