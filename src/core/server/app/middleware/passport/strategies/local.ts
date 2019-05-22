import { Db } from "mongodb";
import { Strategy as LocalStrategy } from "passport-local";

import { VerifyCallback } from "coral-server/app/middleware/passport";
import { RequestLimiter } from "coral-server/app/request/limiter";
import { InvalidCredentialsError } from "coral-server/errors";
import {
  retrieveUserWithProfile,
  verifyUserPassword,
} from "coral-server/models/user";
import { Request } from "coral-server/types/express";
import { Redis } from "ioredis";

const verifyFactory = (
  mongo: Db,
  ipLimiter: RequestLimiter,
  emailLimiter: RequestLimiter
) => async (
  req: Request,
  email: string,
  password: string,
  done: VerifyCallback
) => {
  try {
    await ipLimiter.test(req, req.ip);
    await emailLimiter.test(req, email);

    // The tenant is guaranteed at this point.
    const tenant = req.coral!.tenant!;

    // Get the user from the database.
    const user = await retrieveUserWithProfile(mongo, tenant.id, {
      id: email,
      type: "local",
    });
    if (!user) {
      // The user didn't exist.
      return done(new InvalidCredentialsError("user not found"));
    }

    // Verify the password.
    const passwordVerified = await verifyUserPassword(user, password);
    if (!passwordVerified) {
      return done(new InvalidCredentialsError("invalid password"));
    }

    return done(null, user);
  } catch (err) {
    return done(err);
  }
};

export interface LocalStrategyOptions {
  mongo: Db;
  redis: Redis;
}

export function createLocalStrategy({
  mongo,
  redis: client,
}: LocalStrategyOptions) {
  const ipLimiter = new RequestLimiter({
    client,
    ttl: "10m",
    max: 10,
    prefix: "ip",
  });
  const emailLimiter = new RequestLimiter({
    client,
    ttl: "10m",
    max: 10,
    prefix: "email",
  });

  return new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
      session: false,
      passReqToCallback: true,
    },
    verifyFactory(mongo, ipLimiter, emailLimiter)
  );
}
