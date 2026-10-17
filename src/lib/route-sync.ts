export const ROUTE_TO_PATH: Record<string, string> = {
  landing: "/",
  login: "/login",
  dashboard: "/dashboard",
  parent: "/parent",
  practice: "/practice",
  adaptive: "/adaptive",
  exams: "/exam",
  wordwall: "/wordwall",
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
};

export function routeFromPathname(pathname: string, fallbackRoute = "landing"): string {
  const normalized = (pathname || "/").replace(/\/+$/, "") || "/";
  return PATH_TO_ROUTE[normalized] || fallbackRoute;
}

export function pathnameForRoute(route: string): string {
  return ROUTE_TO_PATH[route] || "/";
}
