import { UserRole } from 'src/constants';

export interface JwtPayload {
  sub: string;
  email: string;
  verifiedAt: Date | null;
  roles: UserRole[];
}
