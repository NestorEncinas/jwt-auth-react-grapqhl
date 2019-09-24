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

@ObjectType()
class Login {
  @Field()
  accessToken: string;
}

@Resolver()
export class UserResolver {
  @Query(() => String)
  hello() {
    return "hi!";
  }

  // auth
  @Query(() => String)
  @UseMiddleware(isAuthorization)
  bye(@Ctx() { validateData }: MyContext) {
    console.log("BYEEEEEEE", validateData);

    return `User Id is: ${validateData!.userId}`;
  }

  @Query(() => [User])
  users() {
    return User.find();
  }

  @Mutation(() => Boolean)
  async revokeRefreshToken(@Arg("userId") userId: number) {
    await getConnection()
      .getRepository(User)
      .increment({ id: userId }, "tokenCount", 1);

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
    res.cookie(
      "gid",
      createRefreshToken(user),
      // cannot be access by JS
      { httpOnly: true }
    );

    // access token should have short expiration date
    // NOTE: not too short, like 2', then u think ur app is not working because of that bs :smiley_face:
    return {
      accessToken: createAccessToken(user)
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
