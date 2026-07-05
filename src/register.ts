// @ts-ignore argon2 is supplied by the server package in generated projects.
import argon2 from "argon2";
// @ts-ignore nodemailer is supplied by the server package in generated projects.
import nodemailer from "nodemailer";

import { FetchedUser, MailTransportConfig, RegistrationInputData, VerificationMail } from "./interfaces";
import {
    AuthError,
    MailTakenError,
    PasswordMismatchError
} from "./errors";

export namespace AuthenticationCoreRegister {
    const DEFAULT_HASH_OPTIONS: argon2.Options = {
        type: argon2.argon2id,
        memoryCost: 2 ** 17,
        timeCost: 4,
        parallelism: 1
    };

    const DEFAULT_MAIL_TRANSPORT_CONFIG: MailTransportConfig = {
        host: "smtp.example.com",
        port: 587,
        secure: false,
        auth: {
            user: "max.mustermann@example.com",
            pass: "password"
        }
    };

    export async function register(
        registrationInputData: RegistrationInputData,
        mailExistsRoutine: (mail: string) => Promise<boolean>,
        customInputData: Record<string, unknown>, // e.g. name, address that should be stored in the database for the new user
        dataProcessing: (identification: string, hashedPassword: string, customInputData: Record<string, unknown>) => Promise<FetchedUser | undefined>,
        verificationMail: VerificationMail,
        mailTransportConfig: MailTransportConfig = DEFAULT_MAIL_TRANSPORT_CONFIG,
        hashOptions: argon2.Options = DEFAULT_HASH_OPTIONS
    ): Promise<FetchedUser> {
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
            // argon2.hash adds a random salt automatically (embedded in the hash output).
            const hashedPassword = await argon2.hash(registrationInputData.typedPassword, hashOptions);
            const newUser = await dataProcessing(registrationInputData.typedMail, hashedPassword, customInputData);

            if (!newUser || !newUser.uuid) {
                throw new AuthError("Data processing did not return a valid user object with a UUID", "INVALID_USER_OBJECT", 500);
            }

            const transporter = nodemailer.createTransport(mailTransportConfig);

            await transporter.sendMail({
                from: verificationMail.from,
                to: newUser.mail,
                subject: verificationMail.subject,
                text: verificationMail.content(newUser.uuid)
            });

            return newUser;
        } catch (e) {
            throw e;
        }
    }
}