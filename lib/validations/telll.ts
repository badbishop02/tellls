import * as z from "zod";

export const TelllValidation = z.object({
  telll: z.string().nonempty().min(3, { message: "Minimum 3 characters." }),
  accountId: z.string(),
});

export const CommentValidation = z.object({
  telll: z.string().nonempty().min(3, { message: "Minimum 3 characters." }),
});
