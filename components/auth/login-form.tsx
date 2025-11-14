"use client";

import { signIn } from "next-auth/react";
import * as z from "zod";
import { useForm } from "react-hook-form";
import { useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";

import { LoginSchema } from "@/schemas";
import { login } from "@/actions/login";

import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { CardWrapper } from "@/components/auth/card-wrapper";
import { Button } from "@/components/ui/button";
import { FormError } from "@/components/form-error";
import { FormSuccess } from "@/components/form-success";

// Extend to allow optional 2FA code on step 2
const FormSchema = LoginSchema.extend({
    code: z.string().optional(),
});

// Safe absolute URL helper for callbackUrl
const origin =
    typeof window !== "undefined" && window.location.origin
        ? window.location.origin
        : "http://localhost:3000";

const toAbsolute = (cb?: string | null) => {
    try {
        return new URL(cb || "/", origin).toString();
    } catch {
        return origin + "/";
    }
};

export const LoginForm = () => {
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    const urlError =
        searchParams.get("error") === "OAuthAccountNotLinked"
            ? "Email already in use with different provider!"
            : "";

    const [showTwoFactor, setShowTwoFactor] = useState(false);
    const [error, setError] = useState<string | undefined>("");
    const [success, setSuccess] = useState<string | undefined>("");
    const [isPending, startTransition] = useTransition();

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: { email: "", password: "", code: "" },
    });

    const handleSubmit = (values: z.infer<typeof FormSchema>) => {
        setError("");
        setSuccess("");

        startTransition(async () => {
            // STEP 1 — password check via server action (no redirect here)
            if (!showTwoFactor) {
                const res = await login(
                    { email: values.email, password: values.password },
                    callbackUrl
                );

                if (res?.error) {
                    form.setValue("password", "");
                    setError(res.error);
                    return;
                }

                if (res?.twoFactor) {
                    setShowTwoFactor(true);
                    // keep email/password in form state so we can submit step 2
                    return;
                }

                if (res?.success) {
                    // In non-2FA case, server action already signed in; navigate
                    window.location.href = toAbsolute(callbackUrl);
                    return;
                }

                setError("Something went wrong");
                return;
            }

            // STEP 2 — actually sign in with 2FA code using Auth.js
// STEP 2 — actually sign in with 2FA code using Auth.js
            const res = await signIn("credentials", {
                email: values.email,
                password: values.password,
                twoFactorCode: values.code || undefined,
                redirect: false,
                redirectTo: toAbsolute(callbackUrl || "/")
            });

            if (res?.ok) {
                window.location.href = toAbsolute(callbackUrl);
                return;
            }

            setError(
                res?.error === "CredentialsSignin"
                    ? "Invalid code"
                    : res?.error || "Something went wrong"
            );

        });
    };

    return (
        <CardWrapper
            headerLabel="Welcome back"
            backButtonLabel="Don't have an account?"
            backButtonHref="/auth/register"
            //showSocial
        >
            <Form {...form}>
                <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
                    <div className="space-y-4">
                        {showTwoFactor ? (
                            <>
                                {/* Keep email/password disabled so values are preserved for step 2 */}
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input {...field} disabled placeholder="john.doe@example.com" type="email" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <Input {...field} disabled placeholder="******" type="password" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="code"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Two Factor Code</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    disabled={isPending}
                                                    placeholder="123456"
                                                    inputMode="numeric"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        ) : (
                            <>
                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    disabled={isPending}
                                                    placeholder="john.doe@example.com"
                                                    type="email"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Password</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    disabled={isPending}
                                                    placeholder="******"
                                                    type="password"
                                                />
                                            </FormControl>
                                            <Button size="sm" variant="link" asChild className="px-0 font-normal">
                                                <Link href="/auth/reset">Forgot password?</Link>
                                            </Button>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </>
                        )}
                    </div>

                    <FormError message={error || urlError} />
                    <FormSuccess message={success} />

                    <Button disabled={isPending} type="submit" className="w-full">
                        {showTwoFactor ? "Confirm" : "Login"}
                    </Button>
                </form>
            </Form>
        </CardWrapper>
    );
};
