export const ROUTE_TO_PATH: Record<string, string> = {
  landing: "/",
  login: "/login",
  dashboard: "/dashboard",
  parent: "/parent",
  practice: "/practice",
  adaptive: "/adaptive",
  exams: "/exam",
  wordwall: "/wordwall",
  'student-lessons': '/konu-anlatimlari',
};

export const PATH_TO_ROUTE: Record<string, string> = {
  "/": "landing",
  "/login": "login",
  "/register": "login",
  "/dashboard": "dashboard",
  "/parent": "parent",
  "/practice": "practice",
  "/adaptive": "adaptive",
  "/exam": "exams",
  "/wordwall": "wordwall",
  '/konu-anlatimlari': 'student-lessons',
};

export function normalizeAppPathname(pathname: string): string {
  return (pathname || "/").replace(/\/+$/, "") || "/";
}

export function routeFromPathname(pathname: string, fallbackRoute = "landing"): string {
  const normalized = normalizeAppPathname(pathname);
  return PATH_TO_ROUTE[normalized] || fallbackRoute;
}

export function pathnameForRoute(route: string): string {
  return ROUTE_TO_PATH[route] || "/";
}
