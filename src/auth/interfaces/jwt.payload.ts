export interface JwtPayload {
  sub: number;
  email: string;
  verifiedAt: Date | null;
}
