import argon2 from "argon2";
import nodemailer from "nodemailer";

import { FetchedUser, RegistrationInputData, VerificationMail } from "./interfaces";
import {
    AuthError,
    MailTakenError,
    PasswordMismatchError
} from "./errors";

export async function register(
    registrationInputData: RegistrationInputData,
    mailExistsRoutine: (mail: string) => Promise<boolean>,
    customInputData: Record<string, unknown>, // e.g. name, address that should be stored in the database for the new user
    dataProcessing: (identification: string, hashedPassword: string, customInputData: Record<string, unknown>) => Promise<FetchedUser>,
    verificationMail: VerificationMail,
    hashOptions: argon2.Options =  { type: argon2.argon2id, memoryCost: 2 ** 17, timeCost: 4, parallelism: 1 }
) {
    let mailExists: boolean;

    try {
        mailExists = await mailExistsRoutine(registrationInputData.typedMail);
    } catch (e) {
        throw e;
    }

    if (mailExists) {
        throw new MailTakenError();
    }

    if (registrationInputData.typedPassword !== registrationInputData.typedPasswordRepeated) {
        throw new PasswordMismatchError();
    }

    try {
        const hashedPassword = await argon2.hash(registrationInputData.typedPassword, hashOptions);
        const newUser = await dataProcessing(registrationInputData.typedMail, hashedPassword, customInputData);

        if (!newUser || !newUser.uuid) {
            throw new AuthError("Data processing did not return a valid user object with a UUID", "INVALID_USER_OBJECT", 500);
        }
        
        await nodemailer.send(
            verificationMail.from,
            newUser.mail,
            verificationMail.subject,
            verificationMail.content(newUser.uuid),
        );
    } catch (e) {
        throw e;
    }
}
