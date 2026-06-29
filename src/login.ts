import jwt from "jsonwebtoken";
import argon2 from "argon2";

import { FetchedUser } from "./interfaces";
import {
    InvalidCredentialsError,
    UserInactiveError,
} from "./errors";

const DEFAULT_JWT_OPTIONS: jwt.SignOptions = {
    algorithm: "HS256",
    expiresIn: "7d",
};

const asyncSign = (payload: string | object | Buffer<ArrayBufferLike>,
    secretOrPrivateKey: jwt.Secret | jwt.PrivateKey,
    options: jwt.SignOptions = {}): Promise<string> => {
  
      return new Promise((resolve, reject) => {
          jwt.sign(payload, secretOrPrivateKey, options, (err, token) => {
              if (err) reject(err);
              else resolve(token as string);
          });
      });
};

export async function login(
    typedMail: string,
    typedPassword: string,
    fetchedUser: FetchedUser | undefined,
    jwtKey: jwt.Secret,
    jwtOptions: jwt.SignOptions = {},
): Promise<string> {
    // TODO: Refactor validation logic to mitigate timing attacks (Username Enumeration).
    // Checking 'fetchedUser' and 'typedName' immediately allows attackers to determine
    // valid usernames based on API response times, as 'argon2.verify' is significantly slower.
    // Consider running a dummy argon2 verification when a user is not found, or returning
    // a generic 'InvalidCredentialsError' for all authentication failures.
    if (!fetchedUser || typedMail !== fetchedUser.mail) {
        const DUMMY_HASH = "$argon2id$v=19$m=65536,t=3,p=1$...";
        await argon2.verify(DUMMY_HASH, typedPassword); // Dummy verification to mitigate timing attacks
        throw new InvalidCredentialsError();
    }

    if (!(await argon2.verify(fetchedUser.password, typedPassword))) {
        throw new InvalidCredentialsError();
    }

    if (!fetchedUser.isActive) {
        throw new UserInactiveError();
    }

    const options = { ...DEFAULT_JWT_OPTIONS, ...jwtOptions };

    try {
        // Signing is async because JWT algorithms may vary in cost.
        // While HS256 is cheap, other algorithms (e.g. RS256/ES256) or external signers (KMS/HSM)
        // can be significantly more expensive or I/O-bound, so the API must avoid blocking the event loop.
        return await asyncSign({ sub: fetchedUser.uuid }, jwtKey, options);
    } catch (error) {
        throw new Error("An unexpected error occurred during login.");
    }
}
