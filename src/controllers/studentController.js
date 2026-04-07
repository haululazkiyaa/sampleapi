const Student = require("../models/Student");
const ApiError = require("../utils/apiError");
const { sendSuccess } = require("../utils/apiResponse");

async function getAllStudents(req, res) {
  const {
    page = 1,
    limit = 10,
    search,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const filter = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { nim: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
      { major: { $regex: search, $options: "i" } },
    ];
  }

  const sort = {
    [sortBy]: sortOrder === "asc" ? 1 : -1,
  };

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
  const { id } = req.params;

  const student = await Student.findById(id).lean();
  if (!student) {
    return next(new ApiError(404, "Student not found"));
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: "Student fetched successfully",
    data: student,
  });
}

async function createStudent(req, res, next) {
  try {
    const payload = {
      ...req.body,
      birthDate: req.body.birthDate ? new Date(req.body.birthDate) : undefined,
    };

    const student = await Student.create(payload);

    return sendSuccess(res, {
      statusCode: 201,
      message: "Student created successfully",
      data: student,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "field";
      return next(new ApiError(409, `Duplicate value for ${field}`));
    }

    return next(error);
  }
}

async function updateStudentById(req, res, next) {
  const { id } = req.params;

  const payload = {
    ...req.body,
    birthDate: req.body.birthDate ? new Date(req.body.birthDate) : undefined,
  };

  try {
    const updatedStudent = await Student.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    }).lean();

    if (!updatedStudent) {
      return next(new ApiError(404, "Student not found"));
    }

    return sendSuccess(res, {
      statusCode: 200,
      message: "Student updated successfully",
      data: updatedStudent,
    });
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || "field";
      return next(new ApiError(409, `Duplicate value for ${field}`));
    }

    return next(error);
  }
}

async function deleteStudentById(req, res, next) {
  const { id } = req.params;

  const deletedStudent = await Student.findByIdAndDelete(id).lean();
  if (!deletedStudent) {
    return next(new ApiError(404, "Student not found"));
  }

  return sendSuccess(res, {
    statusCode: 200,
    message: "Student deleted successfully",
    data: {
      id: deletedStudent._id,
    },
  });
}

module.exports = {
  getAllStudents,
  getStudentById,
  createStudent,
  updateStudentById,
  deleteStudentById,
};
