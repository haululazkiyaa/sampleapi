const { z } = require("zod");

const STUDENT_STATUSES = ["active", "inactive", "graduated", "dropped_out"];

const studentFieldsSchema = z.object({
  nim: z.string().trim().min(5).max(30),
  name: z.string().trim().min(2).max(120),
  email: z
    .email()
    .max(255)
    .transform((value) => value.toLowerCase()),
  major: z.string().trim().min(2).max(120),
  semester: z.int().min(1).max(14),
  gpa: z.number().min(0).max(4).optional(),
  birthDate: z.iso.date().optional(),
});

const createStudentSchema = z.object({
  body: studentFieldsSchema,
});

const updateStudentSchema = z.object({
  body: studentFieldsSchema
    .partial()
    .refine((value) => Object.keys(value).length > 0, {
      message: "At least one field must be provided for update",
    }),
});

const getStudentsQuerySchema = z.object({
  query: z
    .object({
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(10),
      search: z.string().trim().min(1).max(120).optional(),
      major: z.string().trim().min(2).max(120).optional(),
      status: z.enum(STUDENT_STATUSES).optional(),
      semester: z.coerce.number().int().min(1).max(14).optional(),
      gpaMin: z.coerce.number().min(0).max(4).optional(),
      gpaMax: z.coerce.number().min(0).max(4).optional(),
      sortBy: z
        .enum(["name", "nim", "gpa", "semester", "createdAt"])
        .default("createdAt"),
      sortOrder: z.enum(["asc", "desc"]).default("desc"),
    })
    .refine(
      ({ gpaMin, gpaMax }) =>
        gpaMin === undefined || gpaMax === undefined || gpaMin <= gpaMax,
      {
        path: ["gpaMax"],
        message: "gpaMax must be greater than or equal to gpaMin",
      },
    ),
});

const updateStudentStatusSchema = z.object({
  body: z
    .object({
      status: z.enum(STUDENT_STATUSES),
      reason: z.string().trim().min(3).max(250).optional(),
    })
    .superRefine(({ status, reason }, ctx) => {
      if (["inactive", "dropped_out"].includes(status) && !reason) {
        ctx.addIssue({
          code: "custom",
          path: ["reason"],
          message: `reason is required when status is ${status}`,
        });
      }
    }),
});

const bulkUpsertStudentSchema = z.object({
  body: z.object({
    matchBy: z.enum(["nim", "email"]).default("nim"),
    mode: z.enum(["atomic", "partial"]).default("partial"),
    students: z
      .array(z.record(z.string(), z.unknown()))
      .min(1, "At least one student is required")
      .max(100, "A maximum of 100 students can be processed at once"),
  }),
});

const analyticsQuerySchema = z.object({
  query: z
    .object({
      major: z.string().trim().min(2).max(120).optional(),
      status: z.enum(STUDENT_STATUSES).optional(),
      semesterFrom: z.coerce.number().int().min(1).max(14).optional(),
      semesterTo: z.coerce.number().int().min(1).max(14).optional(),
      gpaMin: z.coerce.number().min(0).max(4).optional(),
      gpaMax: z.coerce.number().min(0).max(4).optional(),
      groupBy: z.enum(["major", "semester", "status"]).default("semester"),
    })
    .superRefine(({ semesterFrom, semesterTo, gpaMin, gpaMax }, ctx) => {
      if (
        semesterFrom !== undefined &&
        semesterTo !== undefined &&
        semesterFrom > semesterTo
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["semesterTo"],
          message: "semesterTo must be greater than or equal to semesterFrom",
        });
      }

      if (gpaMin !== undefined && gpaMax !== undefined && gpaMin > gpaMax) {
        ctx.addIssue({
          code: "custom",
          path: ["gpaMax"],
          message: "gpaMax must be greater than or equal to gpaMin",
        });
      }
    }),
});

module.exports = {
  STUDENT_STATUSES,
  studentFieldsSchema,
  createStudentSchema,
  updateStudentSchema,
  getStudentsQuerySchema,
  updateStudentStatusSchema,
  bulkUpsertStudentSchema,
  analyticsQuerySchema,
};
