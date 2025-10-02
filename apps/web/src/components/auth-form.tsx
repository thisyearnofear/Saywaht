"use client";

import { useRouter } from "next/navigation";
import { signUp, signIn } from "@opencut/auth/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import React from 'react';
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "@/lib/icons";
// CLEAN: Inline GoogleIcon to avoid separate icon file
const GoogleIcon = () => (
  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useState } from 'react';

// Zod schemas
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

interface AuthFormProps {
  mode: "login" | "signup";
}

const authConfig = {
  login: {
    title: "Welcome back",
    description: "Sign in to your account to continue",
    buttonText: "Sign in",
    linkText: "Don't have an account?",
    linkHref: "/signup",
    linkLabel: "Sign up",
    successRedirect: "/editor",
  },
  signup: {
    title: "Create your account",
    description: "Get started with your free account today",
    buttonText: "Create account",
    linkText: "Already have an account?",
    linkHref: "/login",
    linkLabel: "Sign in",
    successRedirect: "/login",
  },
} as const;

interface AuthFormContentProps {
  error: string | null;
  setError: (error: string | null) => void;
  isGoogleLoading: boolean;
  config: typeof authConfig.login | typeof authConfig.signup;
  router: ReturnType<typeof useRouter>;
}

function LoginFormContent({
  error,
  setError,
  isGoogleLoading,
  config,
  router,
}: AuthFormContentProps) {
  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const { isSubmitting } = form.formState;
  const isAnyLoading = isSubmitting || isGoogleLoading;

  const onSubmit = async (data: LoginFormData) => {
    setError(null);

    try {
      const { error } = await signIn.email({
        email: data.email,
        password: data.password,
      });

      if (error) {
        setError(error.message || "An unexpected error occurred.");
        return;
      }

      router.push(config.successRedirect);
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="m@example.com"
                  disabled={isAnyLoading}
                  className="h-11"
                  {...field}
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
                  type="password"
                  disabled={isAnyLoading}
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isAnyLoading}
          className="w-full h-11"
          size="lg"
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" />
          ) : (
            config.buttonText
          )}
        </Button>
      </form>
    </Form>
  );
}

function SignupFormContent({
  error,
  setError,
  isGoogleLoading,
  config,
  router,
}: AuthFormContentProps) {
  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", name: "" },
  });

  const { isSubmitting } = form.formState;
  const isAnyLoading = isSubmitting || isGoogleLoading;

  const onSubmit = async (data: SignupFormData) => {
    setError(null);

    try {
      const { error } = await signUp.email({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      if (error) {
        setError(error.message || "An unexpected error occurred.");
        return;
      }

      router.push(config.successRedirect);
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="John Doe"
                  disabled={isAnyLoading}
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="m@example.com"
                  disabled={isAnyLoading}
                  className="h-11"
                  {...field}
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
                  type="password"
                  placeholder="Create a strong password"
                  disabled={isAnyLoading}
                  className="h-11"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isAnyLoading}
          className="w-full h-11"
          size="lg"
        >
          {isSubmitting ? (
            <Loader2 className="animate-spin" />
          ) : (
            config.buttonText
          )}
        </Button>
      </form>
    </Form>
  );
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const config = authConfig[mode];

  const handleGoogleAuth = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      await signIn.social({
        provider: "google",
      });

      router.push(config.successRedirect);
    } catch (error) {
      setError(
        `Failed to ${mode === "login" ? "sign in" : "sign up"} with Google. Please try again.`
      );
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center relative">
      <Button
        variant="text"
        onClick={() => router.back()}
        className="absolute top-6 left-6"
      >
        ← Back
      </Button>

      <Card className="w-[400px] shadow-lg border-0">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-semibold">
            {config.title}
          </CardTitle>
          <CardDescription className="text-base">
            {config.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleGoogleAuth}
              variant="outline"
              size="lg"
              disabled={isGoogleLoading}
            >
              {isGoogleLoading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <GoogleIcon />
              )}
              Continue with Google
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            {mode === "login" ? (
              <LoginFormContent
                error={error}
                setError={setError}
                isGoogleLoading={isGoogleLoading}
                config={config}
                router={router}
              />
            ) : (
              <SignupFormContent
                error={error}
                setError={setError}
                isGoogleLoading={isGoogleLoading}
                config={config}
                router={router}
              />
            )}
          </div>

          <div className="mt-6 text-center text-sm">
            {config.linkText}{" "}
            <Link
              href={config.linkHref}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {config.linkLabel}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
