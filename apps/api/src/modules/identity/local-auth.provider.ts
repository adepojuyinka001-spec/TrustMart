import { ConflictException, Injectable } from "@nestjs/common";
import * as bcrypt from "bcryptjs";
import { PrismaService } from "../../prisma/prisma.service";
import type { AuthIdentity, AuthProvider, RegisterInput } from "./auth-provider.interface";

const SALT_ROUNDS = 12;

// Free, self-hosted default AuthProvider implementation: email/password against our own
// User table. No external identity vendor required. See auth-provider.interface.ts.
@Injectable()
export class LocalAuthProvider implements AuthProvider {
  constructor(private readonly prisma: PrismaService) {}

  async register(input: RegisterInput): Promise<AuthIdentity> {
    const existing = await this.prisma.user.findUnique({ where: { email: input.email } });
    if (existing) {
      throw new ConflictException("An account with this email already exists.");
    }

    const passwordHash = await bcrypt.hash(input.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: input.email,
        passwordHash,
        profile: {
          create: {
            firstName: input.firstName,
            lastName: input.lastName,
          },
        },
      },
    });

    return { userId: user.id, email: user.email };
  }

  async validateCredentials(email: string, password: string): Promise<AuthIdentity | null> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return null;
    }

    const matches = await bcrypt.compare(password, user.passwordHash);
    if (!matches) {
      return null;
    }

    return { userId: user.id, email: user.email };
  }
}
