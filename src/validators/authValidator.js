const { z } = require("zod");

const registerSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(100),
    email: z
      .email()
      .max(255)
      .transform((v) => v.toLowerCase()),
    password: z
      .string()
      .min(8)
      .max(64)
      .regex(
        /^(?=.*[A-Za-z])(?=.*\d).+$/,
        "Password must contain at least one letter and one number",
      ),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z
      .email()
      .max(255)
      .transform((v) => v.toLowerCase()),
    password: z.string().min(1).max(64),
  }),
});

module.exports = {
  registerSchema,
  loginSchema,
};
