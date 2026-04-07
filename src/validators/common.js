const { z } = require("zod");

const objectIdParamSchema = z.object({
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid resource id format"),
  }),
});

module.exports = {
  objectIdParamSchema,
};
