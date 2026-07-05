# authentication-core-lib

A small, framework-agnostic authentication library for TypeScript.

The library is intentionally designed without a fixed database layer. It only provides the core logic for:

- registration
- login
- resolving the current user from a JWT
- error classes and DTOs

Persistence, user lookup, and user creation are connected from the outside via callback functions. This allows you to use the library with an in-memory store, a JSON file, a custom API, or a database.

## Features

- Password hashing with argon2id
- JWT-based authentication
- Active user validation
- Registration validation
- Email notification after successful registration
- Clear separation between core logic and persistence

## Project structure

```text
src/
	current-user.ts   # Verify JWTs and validate active users
	errors.ts         # Central error classes
	interfaces.ts     # Shared types and DTOs
	login.ts          # Login logic
	register.ts       # Registration logic
```

## Installation

The library expects the following runtime dependencies:

- argon2
- jsonwebtoken
- nodemailer

You will typically also want TypeScript.

```bash
npm install argon2 jsonwebtoken nodemailer
npm install -D typescript @types/node
```

## Quick start

### 1. Provide a user store

The login and registration logic works with a `FetchedUser` object and callback functions. For example, you can build an in-memory store:

```ts
import { AuthenticationCoreLogin } from './src/login.ts'
import { AuthenticationCoreRegister } from './src/register.ts'
import { AuthenticationCoreCurrentUser } from './src/current-user.ts'
import type {
	FetchedUser,
	RegistrationInputData,
	VerificationMail,
	MailTransportConfig,
} from './src/interfaces.ts'

const users = new Map<string, FetchedUser>()
```

### 2. Registration

The following callbacks belong to the registration flow:

```ts
async function mailExistsRoutine(mail: string): Promise<boolean> {
	return users.has(mail)
}

async function dataProcessing(
	identification: string,
	hashedPassword: string,
	customInputData: Record<string, unknown>
): Promise<FetchedUser> {
	const user: FetchedUser = {
		uuid: crypto.randomUUID(),
		mail: identification,
		password: hashedPassword,
		isActive: false,
		...customInputData,
	} as FetchedUser

	users.set(identification, user)
	return user
}
```

```ts
const registrationInputData: RegistrationInputData = {
	typedMail: 'demo@example.com',
	typedPassword: 'secret-password',
	typedPasswordRepeated: 'secret-password',
}

const verificationMail: VerificationMail = {
	from: 'no-reply@example.com',
	subject: 'Verify your account',
	content: (uuid: string) => `https://example.com/verify?uuid=${uuid}`,
}

const mailTransportConfig: MailTransportConfig = {
	host: '127.0.0.1',
	port: 1025,
	secure: false,
	auth: {
		user: '',
		pass: '',
	},
}

const newUser = await AuthenticationCoreRegister.register(
	registrationInputData,
	mailExistsRoutine,
	{},
	dataProcessing,
	verificationMail,
	mailTransportConfig,
)
```

### 3. Login

```ts
const token = await AuthenticationCoreLogin.login(
	'demo@example.com',
	'secret-password',
	users.get('demo@example.com'),
	'your-jwt-secret'
)
```

### 4. Resolve the current user

The following callback belongs to the current-user flow:

```ts
async function isActiveCallback(uuid: string): Promise<boolean> {
	for (const user of users.values()) {
		if (user.uuid === uuid) {
			return user.isActive
		}
	}

	return false
}
```

```ts
const userUuid = await AuthenticationCoreCurrentUser.getCurrentUser(
	token,
	'your-jwt-secret',
	isActiveCallback,
)
```

## API overview

### `AuthenticationCoreLogin.login(...)`

Checks mail and password, validates the user status, and generates a JWT.

**Parameters:**

- `typedMail`: email address
- `typedPassword`: plaintext password
- `fetchedUser`: already loaded user or `undefined`
- `jwtKey`: JWT secret
- `jwtOptions`: optional JWT options

**Returns:** JWT as a string

### `AuthenticationCoreRegister.register(...)`

Validates registration input, checks whether the mail address is already taken, hashes the password, and sends a verification email after successful persistence.

**Parameters:**

- `registrationInputData`: mail, password, and password confirmation
- `mailExistsRoutine`: callback for mail lookup
- `customInputData`: additional user data
- `dataProcessing`: callback for storing the new user
- `verificationMail`: verification email configuration
- `mailTransportConfig`: SMTP configuration
- `hashOptions`: argon2 options

**Returns:** the stored user

### `AuthenticationCoreCurrentUser.getCurrentUser(...)`

Verifies a JWT, reads the user ID from `sub`, and checks whether the user is active.

**Parameters:**

- `token`: JWT
- `jwtKey`: secret or public key
- `isActiveCallback`: callback for active-user lookup
- `verifyOptions`: optional JWT verification options

**Returns:** the current user's UUID

## Error classes

The library provides custom error classes with `code` and `statusCode`:

- `AuthError`
- `InvalidCredentialsError`
- `UserInactiveError`
- `InvalidTokenError`
- `MailTakenError`
- `PasswordMismatchError`

This makes it easy to handle errors cleanly in your API or UI.

## Important notes

- The library does not include a fixed database integration.
- Persistence is fully provided through callbacks.
- For production, use a strong JWT secret key.
- For registration emails, use a real SMTP configuration.
- `argon2.verify()` expects the stored hash first and the plaintext password second.

## Example for custom persistence

You can easily connect the library to a database, a REST service, or an in-memory store. The only things you need are suitable implementations for:

- `mailExistsRoutine`
- `dataProcessing`
- `isActiveCallback`

## License

MIT