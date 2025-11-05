import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const publicRoutes = ["/login"];

const publicApiRoutes = [
  "/api/auth",
  "/api/auth/signin",
  "/api/auth/signout",
  "/api/auth/session",
  "/api/auth/providers",
  "/api/auth/csrf",
  "/api/socket",
  "/api/email",
];

const rateLimitMap = new Map();

function rateLimit(identifier, windowMs = 60000, maxRequests = 100) {
  const now = Date.now();
  const windowStart = now - windowMs;

  if (!rateLimitMap.has(identifier)) {
    rateLimitMap.set(identifier, []);
  }

  const requests = rateLimitMap.get(identifier);

  const validRequests = requests.filter(time => time > windowStart);
  rateLimitMap.set(identifier, validRequests);

  if (validRequests.length >= maxRequests) {
    return false;
  }

  validRequests.push(now);
  return true;
}

function addSecurityHeaders(response) {
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=*, microphone=(), geolocation=()');

  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  return response;
}

const roleBasedApiRoutes = {
  "/api/admin": ["admin", "keeper"],
  "/api/admin/direct-rack-stock-update": ["admin"],
  "/api/admin/direct-stock-update": ["admin"],
  "/api/admin/projects-stock": ["admin", "keeper"],
  "/api/admin/actions": ["admin"],
  "/api/upload": ["admin", "manager"],
};

const authenticatedApiRoutes = [
  "/api/Projects",
  "/api/Products",
  "/api/Inventory",
  "/api/activities",
  "/api/racks",
  "/api/Racks",
  "/api/notifications",
  "/api/stock-adjustment-requests",
  "/api/transfer-requests",
  "/api/stockOnHold",
  "/api/manager",
  "/api/generate-product-code",
  "/api/stock-validation",
  "/api/transfers",
  "/api/dashboard",
  "/api/Users",
  "/api/stock-management",
  "/api/orders",
  "/api/nonmovingitems",
  "/api/reports",
  "/api/keeper/included-projects",
  "/api/assets",
];

const sensitiveApiRoutes = [
  "/api/admin",
  "/api/upload",
  "/api/stock-management"
];

const roleBasedRoutes = {
  "/admin": ["admin"],
  "/admin/sessions": ["admin"],
  "/manager": ["admin", "manager"],
  "/manage-users": ["admin", "manager"],
  "/inventory/stock-manage": ["admin", "manager", "keeper"],
  "/assets-management/edit-asset": ["admin", "manager"],
};

const authenticatedRoutes = ["/dashboard", "/reports", "/products", "/inventory", "/notifications", "/transfers"];

export async function middleware(request) {
  const pathname = request.nextUrl.pathname;
  const clientIP = request.ip || request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || '';
  const suspiciousUserAgents = [
    'sqlmap', 'nikto', 'dirbuster', 'gobuster', 'wfuzz', 'burp', 'zap',
    'nmap', 'masscan', 'nuclei', 'wget', 'curl'
  ];

  if (suspiciousUserAgents.some(agent => userAgent.toLowerCase().includes(agent))) {
    console.warn(`🚫 Suspicious user agent detected: ${userAgent} from IP ${clientIP}`);
    return new NextResponse(
      JSON.stringify({
        error: "Access denied",
        message: "Automated scanning is not allowed"
      }),
      {
        status: 403,
        headers: { "content-type": "application/json" },
      }
    );
  }
  if (pathname === "/") {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });

    if (token) {
      const response = NextResponse.redirect(new URL("/dashboard", request.url));
      return addSecurityHeaders(response);
    } else {
      const response = NextResponse.redirect(new URL("/login", request.url));
      return addSecurityHeaders(response);
    }
  }
  const isPublicRoute = publicRoutes.some((path) => pathname.startsWith(path));
  const isPublicApiRoute = publicApiRoutes.some((path) =>
    pathname.startsWith(path)
  );

  if (isPublicRoute || isPublicApiRoute) {
    if (pathname.startsWith('/login')) {
      const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
      if (token) {
        const response = NextResponse.redirect(new URL('/dashboard', request.url));
        return addSecurityHeaders(response);
      }
    }
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    if (pathname.startsWith("/api/")) {
      console.warn(`🔒 Unauthorized API access attempt: ${pathname} from IP ${clientIP}`);
      return new NextResponse(
        JSON.stringify({
          error: "Authentication required",
          message: "You must be logged in to access this API endpoint",
          timestamp: new Date().toISOString()
        }),
        {
          status: 401,
          headers: {
            "content-type": "application/json",
            "WWW-Authenticate": "Bearer"
          },
        }
      );
    } else {
      const url = new URL("/login", request.url);
      url.searchParams.set("callbackUrl", pathname);
      const response = NextResponse.redirect(url);
      return addSecurityHeaders(response);
    }
  }
  if (token) {
    if (!token.email || !token.role || !token.sub) {
      console.warn(`🚫 Invalid token structure from IP ${clientIP}: ${JSON.stringify(token)}`);
      return new NextResponse(
        JSON.stringify({
          error: "Invalid authentication token",
          message: "Please log in again"
        }),
        {
          status: 401,
          headers: { "content-type": "application/json" },
        }
      );
    }
    if (token.role === 'admin' && pathname.startsWith('/api/admin')) {
      console.log(` Admin action: ${token.email} accessed ${pathname} from IP ${clientIP}`);
    }
  }

  // Keeper-specific page access restrictions (must run before generic authenticated page allowance)
  if (!pathname.startsWith("/api/") && token?.role === "keeper") {
    const urlObj = request.nextUrl;
    const typeParam = urlObj.searchParams.get("type");

    const keeperBlockedStartsWith = [
      "/assets-management",
      "/reports",
      "/manage-projects",
      "/manage-users",
      "/settings",
    ];

    const isBlockedByPrefix = keeperBlockedStartsWith.some((route) =>
      pathname === route || pathname.startsWith(`${route}/`)
    );

    const isBlockedOrderCreateOut =
      (pathname === "/inventory/order-create" || pathname.startsWith("/inventory/order-create/")) &&
      typeParam === "out";

    if (isBlockedByPrefix || isBlockedOrderCreateOut) {
      console.warn(`🚫 Keeper page access denied: ${token.email} (${token.role}) tried to access ${pathname}`);
      const response = NextResponse.redirect(new URL("/dashboard", request.url));
      return addSecurityHeaders(response);
    }
  }

  // Manager-specific page access restrictions
  if (!pathname.startsWith("/api/") && token?.role === "manager") {
    const urlObj = request.nextUrl;
    const typeParam = urlObj.searchParams.get("type");

    const managerBlockedStartsWith = [
      "/reports",
      "/manage-projects",
      "/manage-users",
      "/settings",
    ];

    const isBlockedByPrefix = managerBlockedStartsWith.some((route) =>
      pathname === route || pathname.startsWith(`${route}/`)
    );

    const isStockManageBlocked =
      (pathname === "/inventory/stock-manage" || pathname.startsWith("/inventory/stock-manage/")) &&
      (typeParam === "in" || typeParam === "out");

    if (isBlockedByPrefix || isStockManageBlocked) {
      console.warn(`🚫 Manager page access denied: ${token.email} (${token.role}) tried to access ${pathname}`);
      const response = NextResponse.redirect(new URL("/dashboard", request.url));
      return addSecurityHeaders(response);
    }
  }

  if (pathname.startsWith("/api/")) {
    if (pathname.startsWith("/api/Users")) {
      if (request.method === "GET" && pathname.match(/^\/api\/Users\/[a-f\d]{24}$/)) {
        const response = NextResponse.next();
        return addSecurityHeaders(response);
      }
      else if (!["admin"].includes(token.role)) {
        console.warn(`🚫 Users API access denied: ${token.email} (${token.role}) tried to access ${pathname} from IP ${clientIP}`);
        return new NextResponse(
          JSON.stringify({
            error: "Access denied",
            message: "This operation requires admin role",
            userRole: token.role,
            timestamp: new Date().toISOString()
          }),
          {
            status: 403,
            headers: { "content-type": "application/json" },
          }
        );
      } else {
        const response = NextResponse.next();
        return addSecurityHeaders(response);
      }
    }

    const normalizedPath = pathname.replace(/\/$/, "").split("?")[0];
    for (const [route, roles] of Object.entries(roleBasedApiRoutes)) {
      const normalizedRoute = route.replace(/\/$/, "");
      if (normalizedPath === normalizedRoute || normalizedPath.startsWith(normalizedRoute + "/")) {
        if (!roles.includes(token.role)) {
          console.warn(`🚫 Role-based access denied: ${token.email} (${token.role}) tried to access ${pathname} from IP ${clientIP}`);
          return new NextResponse(
            JSON.stringify({
              error: "Access denied",
              message: `This API endpoint requires one of the following roles: ${roles.join(", ")}`,
              userRole: token.role,
              timestamp: new Date().toISOString()
            }),
            {
              status: 403,
              headers: { "content-type": "application/json" },
            }
          );
        } else {
          const response = NextResponse.next();
          return addSecurityHeaders(response);
        }
      }
    }

    const isAuthenticatedApiRoute = authenticatedApiRoutes.some((route) =>
      pathname.startsWith(route)
    );

    if (isAuthenticatedApiRoute) {
      const response = NextResponse.next();
      return addSecurityHeaders(response);
    }

    if (pathname.startsWith("/api/upload")) {
      if (request.method !== 'POST') {
        return new NextResponse(
          JSON.stringify({
            error: "Method not allowed",
            message: "Only POST method is allowed for file uploads"
          }),
          {
            status: 405,
            headers: { "content-type": "application/json" },
          }
        );
      }
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) { // 10MB limit
        return new NextResponse(
          JSON.stringify({
            error: "Payload too large",
            message: "File size exceeds maximum allowed limit"
          }),
          {
            status: 413,
            headers: { "content-type": "application/json" },
          }
        );
      }
    }
    console.warn(`🚫 Unknown API endpoint accessed: ${pathname} by ${token.email} from IP ${clientIP}`);
    return new NextResponse(
      JSON.stringify({
        error: "API endpoint not found or access denied",
        message: "This API endpoint is not available or you don't have permission to access it",
        timestamp: new Date().toISOString()
      }),
      {
        status: 404,
        headers: { "content-type": "application/json" },
      }
    );
  }
  // Allow all roles to access dashboard; no role-based redirects away from it
  if (
    authenticatedRoutes.some(
      (route) => pathname === route || pathname.startsWith(`${route}/`)
    )
  ) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  for (const [route, roles] of Object.entries(roleBasedRoutes)) {
    if (pathname.startsWith(route)) {
      if (!roles.includes(token.role)) {
        console.warn(`🚫 Page access denied: ${token.email} (${token.role}) tried to access ${pathname} from IP ${clientIP}`);
        return new NextResponse(
          JSON.stringify({
            message: "Access denied: Insufficient permissions",
            requiredRoles: roles,
            userRole: token.role,
            timestamp: new Date().toISOString()
          }),
          {
            status: 403,
            headers: { "content-type": "application/json" },
          }
        );
      }
      const response = NextResponse.next();
      return addSecurityHeaders(response);
    }
  }

  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

export const config = {
  matcher: [
    "/api/((?!auth|socket).*)",
    "/((?!_next/static|_next/image|favicon.ico|fonts|images|socket.io|socket-test.html).*)",
  ],
};