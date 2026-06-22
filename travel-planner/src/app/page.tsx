import { auth } from "@/lib/auth"
import Chat from "@/components/Chat"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const [memories, tripPlans] = await Promise.all([
    prisma.memory.findMany({ where: { userId: session.user.id } }),
    prisma.tripPlan.findMany({
      where: { userId: session.user.id },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
    }),
  ])

  const memoryMap = Object.fromEntries(
    memories.map((m) => [m.key, m.value])
  )

  const plans = tripPlans.map((p) => ({
    id: p.id,
    title: p.title,
    updatedAt: p.updatedAt.toISOString(),
  }))

  return (
    <main className="flex-1 flex h-dvh">
      <Chat
        userName={session.user.name || undefined}
        memories={memoryMap}
        plans={plans}
      />
    </main>
  )
}
