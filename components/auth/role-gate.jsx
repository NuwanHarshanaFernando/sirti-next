"use client";
import React from "react";
import { useSession } from "next-auth/react";

/**
 * RoleGate renders children only when the user is authenticated and matches any of the roles.
 * While loading, renders fallback (or null). If not authorized, renders unauthorized (or null).
 */
export default function RoleGate({ roles = [], fallback = null, unauthorized = null, children }) {
  const { data: session, status } = useSession();

  if (status === "loading") return fallback;
  if (status !== "authenticated") return unauthorized;

  if (roles.length === 0) return children;

  const role = session?.user?.role?.toLowerCase?.();
  const allowed = roles.map((r) => r.toLowerCase()).includes(role);
  return allowed ? children : unauthorized;
}
