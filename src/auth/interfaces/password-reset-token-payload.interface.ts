export interface PasswordResetTokenPayload {
  email: string;
  iat?: number; // JWT issued at timestamp (seconds since epoch)
}
