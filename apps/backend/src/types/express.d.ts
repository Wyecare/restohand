import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}
