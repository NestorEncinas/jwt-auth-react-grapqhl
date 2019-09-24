import "dotenv/config";
import "reflect-metadata";
import express from "express";
import cors from "cors";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";
import { UserResolver } from "./UserResolver";
import { createConnection } from "typeorm";
import cookieParser from "cookie-parser";
import { verify } from "jsonwebtoken";
import { User } from "./entity/User";
import { createAccessToken, createRefreshToken } from "./authorization";
import { sendRefreshToken } from "./sendRefreshToken";

(async () => {
  const app = express();

  app.use(
    cors({
      origin: "http://localhost:3000",
      credentials: true
    })
  );

  app.use(cookieParser());

  // check if express is working
  app.get("/", (_, res) => res.send("tete"));

  // handle refresh_token ?
  app.post("/refresh_token", async (req, res) => {
    const token = req.cookies.gid;

    if (!token) {
      return res.send({ ok: false, accessToken: "" });
    }

    let payload: any;
    try {
      payload = verify(token, process.env.JWT_REFRESH_SECRET!);
    } catch (err) {
      console.log(err);
      return res.send({ ok: false, accessToken: "" });
    }

    // refreshToken is valid, send back accessToken

    const user = await User.findOne({ id: payload.userId });

    if (!user) {
      return res.send({ ok: false, accessToken: "" });
    }

    if (user.tokenCount !== payload.tokenCount) {
      return res.send({ ok: false, accessToken: "" });
    }

    sendRefreshToken(res, createRefreshToken(user));

    return res.send({ ok: true, accessToken: createAccessToken(user) });
  });

  await createConnection();

  const server = new ApolloServer({
    schema: await buildSchema({
      resolvers: [UserResolver]
    }),
    context: ({ req, res }: { req: Request; res: Response }) => ({
      req,
      res
    })
  });

  server.applyMiddleware({ app, cors: false });

  app.listen(4000, () => {
    console.log("Apollo Server on http://localhost:4000/graphql");
  });
})();
