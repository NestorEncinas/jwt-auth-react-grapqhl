import {
  Resolver,
  Query,
  Mutation,
  Arg,
  ObjectType,
  Field,
  Ctx,
  UseMiddleware
} from "type-graphql";
import { hash, compare } from "bcryptjs";

import { User } from "./entity/User";
import { MyContext } from "./MyContext";
import { createRefreshToken, createAccessToken } from "./authorization";
import { isAuthorization } from "./isAuthorization";
import { getConnection } from "typeorm";
import { verify } from "jsonwebtoken";
import { sendRefreshToken } from "./sendRefreshToken";

@ObjectType()
class Login {
  @Field()
  accessToken: string;

  @Field(() => User)
  user: User;
}

@Resolver()
export class UserResolver {
  @Query(() => String)
  hello() {
    return "hi!";
  }

  @Query(() => User, { nullable: true })
  me(@Ctx() context: MyContext) {
    const authorization = context.req.headers["authorization"];

    if (!authorization) {
      return null;
    }

    try {
      const token = authorization.replace("Bearer ", "");
      const validateData: any = verify(token, process.env.JWT_SECRET!);

      return User.findOne(validateData.userId);
    } catch (err) {
      console.log(err);
      return null;
    }
  }

  @Query(() => [User])
  users() {
    return User.find();
  }

  // auth - TEST PURPOSES
  @Query(() => String)
  @UseMiddleware(isAuthorization)
  bye(@Ctx() { validateData }: MyContext) {
    return `User Id is: ${validateData!.userId}`;
  }

  // auth - TEST PURPOSES
  @Mutation(() => Boolean)
  async revokeRefreshToken(@Arg("userId") userId: number) {
    await getConnection()
      .getRepository(User)
      .increment({ id: userId }, "tokenCount", 1);

    return true;
  }

  @Mutation(() => Boolean)
  async logout(@Ctx() { res }: MyContext) {
    sendRefreshToken(res, "");

    return true;
  }

  @Mutation(() => Login)
  async login(
    @Arg("email") email: string,
    @Arg("password") password: string,
    @Ctx() { res }: MyContext
  ): Promise<Login> {
    const user = await User.findOne({ where: { email } });

    if (!user) {
      throw new Error("User Not Found!");
    }

    const validPwd = await compare(password, user.password);

    if (!validPwd) {
      throw new Error("Invalid Password");
    }

    // add the refresh token as cookie
    // better way???
    sendRefreshToken(res, createRefreshToken(user));

    // access token should have short expiration date
    // NOTE: not too short, like 2', then u think ur app is not working because of that bs :smiley_face:
    return {
      accessToken: createAccessToken(user),
      user
    };
  }

  @Mutation(() => Boolean)
  async register(
    @Arg("email") email: string,
    @Arg("password") password: string
  ) {
    const hashedPwd = await hash(password, 12);

    try {
      await User.insert({
        email,
        password: hashedPwd
      });
    } catch (error) {
      return false;
    }

    return true;
  }
}
