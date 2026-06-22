import { PrismaClient } from "@prisma/client"
import path from "path"

function resolveDbUrl(url: string | undefined): string {
  if (!url) return "file:./prisma/dev.db"
  const match = url.match(/^file:(\.\/.*)$/)
  if (match) {
    return `file:${path.join(process.cwd(), "prisma", match[1])}`
  }
  return url
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: resolveDbUrl(process.env.DATABASE_URL),
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
