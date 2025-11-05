"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import Image from "next/image";
import { toast } from "sonner";
import { MainLogo } from "@/components/icons/icons";
import { Badge } from "@/components/ui/badge";
import { useAppVersion } from "@/hooks/use-app-version";

export default function LoginPage() {
  const [accessCode, setAccessCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { data: session, status } = useSession();
  const appVersion = useAppVersion();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    }
  }, [status, router]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: accessCode,
        password,
      });

      if (result.error) {
        toast.error("Invalid access code or password", {
          description: "Please check your credentials and try again",
          duration: 4000,
        });
        setError("Invalid access code or password");
      } else {
        toast.success("Authentication Successful!", {
          description: "You will be redirected to portal soon.",
        });
        router.push("/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      toast.error("Login failed", {
        description: "An error occurred during login. Please try again.",
        duration: 4000,
      });
      setError("An error occurred during login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <MainLogo className="text-amalfitanAzure w-[300px]" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <div className="flex items-center justify-center w-full p-20 lg:w-1/2">
        <div className="flex flex-col justify-between w-full h-full max-w-md gap-5 max-h-[500px]">
          <Image
            src="/images/mainLogo.png"
            alt="Login Illustration"
            width={1000}
            height={1000}
            className="object-contain object-center w-[240px] h-full"
          />
          <div className="flex flex-col justify-between w-full gap-6">
            <div className="flex flex-col items-start gap-2">
              <div className="flex items-center gap-2">
                <h1>WMS Control Portal</h1>
                <Badge variant="version">V.{appVersion}</Badge>
              </div>
              <h3>Log in to your account.</h3>
            </div>
            <LoginForm
              onSubmit={handleLogin}
              accessCode={accessCode}
              setAccessCode={setAccessCode}
              password={password}
              setPassword={setPassword}
              loading={loading}
            />
          </div>
          <p className="text-black/57">
            Copyright © 2025 Sirti Mena, All Right Reserved.
          </p>
        </div>
      </div>
      <div className="hidden w-1/2 lg:block">
        <Image
          src="/images/loginBackground.jpg"
          alt="Login Illustration"
          width={1300}
          height={1300}
          className="object-cover object-center w-full h-full"
        />
      </div>
    </div>
  );
}
