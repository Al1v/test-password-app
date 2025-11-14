// types/next-auth.d.ts
import "next-auth"; // IMPORTANT — pulls in the real module for augmentation
import type { DefaultSession, User as NextAuthUser } from "next-auth";
import type { UserRole } from "@/lib/roles";

declare module "next-auth" {
    interface Session {
        user: DefaultSession["user"] & {
            id: string;
            role: UserRole;
            isTwoFactorEnabled: boolean;
            isOAuth: boolean;
        };
    }

    interface User extends NextAuthUser {
        role: UserRole;
        isTwoFactorEnabled: boolean;
        isOAuth: boolean;
    }
}

export {};
