"use client";

import { useRouter } from "next/navigation";
import { signIn } from "@opencut/auth/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { GoogleIcon } from "@/components/icons";

function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isEmailLoading, setIsEmailLoading] = React.useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = React.useState(false);

  const handleLogin = async () => {
    setError(null);
    setIsEmailLoading(true);

    const { error } = await signIn.email({
      email,
      password,
    });

    if (error) {
      setError(error.message || "An unexpected error occurred.");
      setIsEmailLoading(false);
      return;
    }

    router.push("/editor");
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsGoogleLoading(true);

    try {
      await signIn.social({
        provider: "google",
      });
      router.push("/editor");
    } catch (error) {
      setError("Failed to sign in with Google. Please try again.");
      setIsGoogleLoading(false);
    }
  };

  const isAnyLoading = isEmailLoading || isGoogleLoading;

  return (
    <div className="flex flex-col space-y-6">
      {error && (
        <Alert variant="destructive">
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Button
        onClick={handleGoogleLogin}
        variant="outline"
        size="lg"
        disabled={isAnyLoading}
      >
        {isGoogleLoading ? (
          <Loader2 className="animate-spin" />
        ) : (
          <GoogleIcon />
        )}{" "}
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
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="m@example.com"
            value={email}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
            disabled={isAnyLoading}
            className="h-11"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            disabled={isAnyLoading}
            className="h-11"
          />
        </div>
        <Button
          onClick={handleLogin}
          disabled={isAnyLoading || !email || !password}
          className="w-full h-11"
          size="lg"
        >
          {isEmailLoading ? <Loader2 className="animate-spin" /> : "Sign in"}
        </Button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="flex h-screen items-center justify-center relative">
      <Button
        variant="text"
        onClick={() => router.back()}
        className="absolute top-6 left-6"
      >
        Back
      </Button>
      <Card className="w-[400px] shadow-lg border-0">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-semibold">Welcome back</CardTitle>
          <CardDescription className="text-base">
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <LoginForm />
          <div className="mt-6 text-center text-sm">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}