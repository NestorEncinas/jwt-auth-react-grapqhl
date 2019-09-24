import { sign } from "jsonwebtoken";

import { User } from "./entity/User";

export const createAccessToken = (user: User) => {
  return sign({ userId: user.id }, process.env.JWT_SECRET!, {
    // :)
    expiresIn: "15m"
  });
};

export const createRefreshToken = (user: User) => {
  return sign(
    { userId: user.id, tokenCount: user.tokenCount },
    process.env.JWT_REFRESH_SECRET!,
    {
      expiresIn: "7d"
    }
  );
};
