const { z } = require("zod");

const createStudentSchema = z.object({
  body: z.object({
    nim: z.string().trim().min(5).max(30),
    name: z.string().trim().min(2).max(120),
    email: z
      .email()
      .max(255)
      .transform((v) => v.toLowerCase()),
    major: z.string().trim().min(2).max(120),
    semester: z.int().min(1).max(14),
    gpa: z.number().min(0).max(4).optional(),
    birthDate: z.iso.date().optional(),
  }),
});

const updateStudentSchema = z.object({
  body: z
    .object({
      nim: z.string().trim().min(5).max(30).optional(),
      name: z.string().trim().min(2).max(120).optional(),
      email: z
        .email()
        .max(255)
        .transform((v) => v.toLowerCase())
        .optional(),
      major: z.string().trim().min(2).max(120).optional(),
      semester: z.int().min(1).max(14).optional(),
      gpa: z.number().min(0).max(4).optional(),
      birthDate: z.iso.date().optional(),
    })
    .refine((obj) => Object.keys(obj).length > 0, {
      message: "At least one field must be provided for update",
    }),
});

const getStudentsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    search: z.string().trim().max(120).optional(),
    sortBy: z.enum(["name", "nim", "createdAt"]).default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),
  }),
});

module.exports = {
  createStudentSchema,
  updateStudentSchema,
  getStudentsQuerySchema,
};
