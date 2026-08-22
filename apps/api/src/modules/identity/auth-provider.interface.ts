// Seam between AuthService and whichever identity backend is active.
// Open Decision #2 (self-hosted vs. managed identity provider) is not resolved yet —
// this interface lets the rest of the app depend only on AuthProvider, so swapping the
// concrete implementation later does not require touching AuthService or controllers.

export const AUTH_PROVIDER = "AUTH_PROVIDER";

export interface AuthIdentity {
  userId: string;
  email: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthProvider {
  register(input: RegisterInput): Promise<AuthIdentity>;
  validateCredentials(email: string, password: string): Promise<AuthIdentity | null>;
}
