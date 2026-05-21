"use client";

import { useState, useEffect, type SyntheticEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { getDictionary } from "@/lib/i18n";
import { adminCreateUser } from "@/app/actions/auth";

type Mode = "signin" | "signup";

export default function LoginPage() {
  const {
    pages: { login },
  } = getDictionary();
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const next = searchParams.get("next") ?? "/orders";

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (errorParam === "unauthorized") {
      createClient().auth.signOut();
    }
  }, [errorParam]);

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setSubmitError(null);

    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (error) {
        setSubmitError(error.message);
      } else {
        router.push(next);
      }
    } else {
      const { error: createError } = await adminCreateUser(email, password);
      if (createError) {
        setLoading(false);
        setSubmitError(createError);
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      setLoading(false);
      if (signInError) {
        setSubmitError(signInError.message);
      } else {
        router.push(next);
      }
    }
  }

  const displayError =
    errorParam === "unauthorized"
      ? login.errorUnauthorized
      : errorParam === "callback"
        ? login.errorCallback
        : submitError;

  const isSignIn = mode === "signin";

  return (
    <div className="flex items-center justify-center min-h-screen px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{isSignIn ? login.titleSignIn : login.titleSignUp}</CardTitle>
          <CardDescription>
            {isSignIn ? login.descriptionSignIn : login.descriptionSignUp}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{login.emailLabel}</Label>
              <Input
                id="email"
                type="email"
                placeholder={login.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{login.passwordLabel}</Label>
              <Input
                id="password"
                type="password"
                placeholder={login.passwordPlaceholder}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            {displayError && (
              <Alert variant="destructive">
                <AlertDescription>{displayError}</AlertDescription>
              </Alert>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? login.submitting
                : isSignIn
                  ? login.submitSignIn
                  : login.submitSignUp}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center text-sm">
          <span className="text-muted-foreground">
            {isSignIn ? login.noAccount : login.hasAccount}
          </span>
          <Button
            variant="link"
            className="px-1 h-auto text-sm"
            onClick={() => {
              setMode(isSignIn ? "signup" : "signin");
              setSubmitError(null);
            }}
          >
            {isSignIn ? login.switchToSignUp : login.switchToSignIn}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
