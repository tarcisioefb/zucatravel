import { auth } from "@/lib/auth"

export const proxy = auth

export const config = {
  matcher: ["/((?!login|signup|api/auth|_next/static|_next/image|favicon.ico).*)"],
}
