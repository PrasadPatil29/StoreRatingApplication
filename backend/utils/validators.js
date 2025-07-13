const { z } = require("zod");

const signupSchema = z.object({
  name: z.string().min(20).max(60),
  email: z.string().email(),
  address: z.string().max(400),
  password: z.string()
    .min(8)
    .max(16)
    .regex(/[A-Z]/, "Must include an uppercase letter")
    .regex(/[^A-Za-z0-9]/, "Must include a special character")
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

module.exports = {
  signupSchema,
  loginSchema
};
