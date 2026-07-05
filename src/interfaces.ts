export interface FetchedUser {
    uuid: string;
    mail: string;
    password: string;
    isActive: boolean;
}

export interface RegistrationInputData {
    typedMail: string;
    typedPassword: string;
    typedPasswordRepeated: string;
}

export interface VerificationMail {
    from: string;
    subject: string;
    content(uuid: string): string;
}

export interface MailTransportConfig {
    host: string;
    port: number;
    secure: boolean;
    auth: {
        user: string;
        pass: string;
    };
}