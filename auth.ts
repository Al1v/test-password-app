import "server-only";
import NextAuth, { type DefaultSession } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import authConfig from "@/auth.config";
import { db } from "@/lib/db";
import { UserRole } from "@/lib/roles";
import { getUserById } from "@/data/user";
import { getAccountByUserId } from "@/data/account";
import type { Adapter } from "@auth/core/adapters";

// 🔥 Module augmentation for Session goes here
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: UserRole;
      isTwoFactorEnabled: boolean;
      isOAuth: boolean;
    } & DefaultSession["user"];
  }
}
export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth({
  // --- pages (optional) ---
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },

  events: {
    async linkAccount({ user }) {
      await db.user.update({
        where: { id: user.id },
        data: { emailVerified: new Date() },
      });
    },
  },

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "credentials") return true;

      if (!user.id) return false;

      const existingUser = await getUserById(user.id);
      if (!existingUser) return false;

      return true;
    },

    async session({ token, session }) {
      if (token.sub && session.user) {
        session.user.id = token.sub;
      }

      if (session.user) {
        if (token.role) {
          session.user.role = token.role as UserRole;
        }

        session.user.isTwoFactorEnabled = Boolean(token.isTwoFactorEnabled);
        session.user.isOAuth = Boolean(token.isOAuth);

        session.user.name = token.name ?? session.user.name ?? null;
        session.user.email = token.email ?? session.user.email ?? null;
      }

      (session as any).pending2FA = Boolean((token as any).pending2FA);
      return session;
    },

    async jwt({ token, user }) {
      if (!token.sub) return token;

      const existingUser = await getUserById(token.sub);
      if (!existingUser) return token;

      const existingAccount = await getAccountByUserId(existingUser.id);

      token.isOAuth = !!existingAccount;
      token.name = existingUser.name;
      token.email = existingUser.email;
      token.role = existingUser.role;
      token.isTwoFactorEnabled = existingUser.isTwoFactorEnabled;

      if (user && (user as any).pending2FA) {
        (token as any).pending2FA = true;
      } else if (user) {
        delete (token as any).pending2FA;
      }

      return token;
    },
  },

  adapter: PrismaAdapter(db) as Adapter,
  session: { strategy: "jwt" },

  ...authConfig,
});
