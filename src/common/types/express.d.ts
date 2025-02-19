import { User } from './path-to-your-user-model'; 

declare global {
  namespace Express {
    interface Request {
      user?: User; 
    }
  }
}