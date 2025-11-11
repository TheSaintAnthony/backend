import { UserRole } from 'src/constants';

export interface JwtPayload {
  sub: number;
  email: string;
  verifiedAt: Date | null;
  roles: UserRole[];
}
