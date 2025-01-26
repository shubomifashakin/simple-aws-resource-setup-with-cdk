import * as zod from "zod";

export const newUserValidator = zod.object({
  username: zod
    .string({ message: "Invalid type of username" })
    .min(3, { message: "Username is too short" }),
  firstName: zod
    .string({ message: "invalid type of first name" })
    .min(3, { message: "first name too short" }),
  lastName: zod
    .string({ message: "invalid type of last name" })
    .min(3, { message: "last name too short" }),
  profilePicture: zod
    .string({ message: "invalid image url" })
    .base64({ message: "invalid profile image" }),
});

export const pathParametersValidator = zod.object({
  username: zod
    .string({ message: "Invalid type of username" })
    .min(3, { message: "invalid username" }),
});
