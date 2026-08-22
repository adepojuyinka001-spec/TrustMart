import type { Request } from "express";

export interface RequestUser {
  userId: string;
  email: string;
}

export interface AuthenticatedRequest extends Request {
  user?: RequestUser;
}
