import { UserRole } from './entities/user.entity';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  customerId?: string | null;
  supportTeamId?: string | null;
}

export interface AuthenticatedRequest {
  user: AuthenticatedUser;
}