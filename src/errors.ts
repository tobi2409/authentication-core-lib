export class AuthError extends Error {
    code: string;
    statusCode: number;

    constructor(message: string, code: string, statusCode: number) {
        super(message);
        this.name = new.target.name;
        this.code = code;
        this.statusCode = statusCode;
    }
}

export class InvalidCredentialsError extends AuthError {
    constructor() {
        super("Invalid credentials", "INVALID_CREDENTIALS", 401);
    }
}

export class UserInactiveError extends AuthError {
    constructor() {
        super("User is inactive", "USER_INACTIVE", 403);
    }
}

export class InvalidTokenError extends AuthError {
    constructor(message = "Invalid token") {
        super(message, "INVALID_TOKEN", 401);
    }
}

export class MailTakenError extends AuthError {
    constructor() {
        super("Email is already taken", "MAIL_TAKEN", 409);
    }
}

export class PasswordMismatchError extends AuthError {
    constructor() {
        super("Passwords do not match", "PASSWORD_MISMATCH", 400);
    }
}