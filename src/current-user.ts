// @ts-ignore jsonwebtoken is supplied by the server package in generated projects.
import jwt from "jsonwebtoken";

import {
    InvalidTokenError,
    UserInactiveError
} from "./errors";

export namespace AuthenticationCoreCurrentUser {
    const DEFAULT_VERIFY_OPTIONS: jwt.VerifyOptions = {
        algorithms: ["HS256"]
    };

    function asyncVerify(
        token: string,
        secretOrPublicKey: jwt.Secret | jwt.PublicKey,
        options: jwt.VerifyOptions = {}
    ): Promise<string | jwt.JwtPayload> {
        return new Promise((resolve, reject) => {
            jwt.verify(token, secretOrPublicKey, options, (err: jwt.VerifyErrors | null, decoded: object | string | undefined) => {
                if (err) reject(err);
                else resolve(decoded as string | jwt.JwtPayload);
            });
        });
    }

    export async function getCurrentUser(
        token: string,
        jwtKey: jwt.Secret,
        isActiveCallback: (uuid: string) => Promise<boolean>,
        verifyOptions: jwt.VerifyOptions = {}
    ): Promise<string> {
        const options = { ...DEFAULT_VERIFY_OPTIONS, ...verifyOptions };

        let payload: string | jwt.JwtPayload;

        try {
            payload = await asyncVerify(token, jwtKey, options);
        } catch (e) {
            throw new InvalidTokenError("Token verification failed");
        }

        if (typeof payload === "string") {
            throw new InvalidTokenError("Invalid token payload type");
        }

        if (typeof payload.sub !== "string") {
            throw new InvalidTokenError("Token payload does not contain valid 'sub'");
        }

        if (!(await isActiveCallback(payload.sub))) {
            throw new UserInactiveError();
        }

        return payload.sub;
    }
}