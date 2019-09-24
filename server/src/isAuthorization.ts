import { MiddlewareFn } from "type-graphql";
import { verify } from "jsonwebtoken";

import { MyContext } from "./MyContext";

// Bearer `${token}

export const isAuthorization: MiddlewareFn<MyContext> = ({ context }, next) => {
  const authorization = context.req.headers["authorization"];

  if (!authorization) {
    throw new Error("Not Authenticated!");
  }

  try {
    const token = authorization.replace("Bearer ", "");
    const validateData = verify(token, process.env.JWT_SECRET!);
    context.validateData = validateData as any;
  } catch (err) {
    console.log(err);
    throw new Error("not authenticated");
  }

  return next();
};
