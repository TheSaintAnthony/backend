export interface PasswordResetTokenPayload {
  email: string;
  iat?: string; // JWT issued at timestamp (seconds since epoch)
}
