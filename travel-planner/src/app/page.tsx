import { auth } from "@/lib/auth"
import Chat from "@/components/Chat"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"

export default async function Home() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const memories = await prisma.memory.findMany({
    where: { userId: session.user.id },
  })

  const memoryMap = Object.fromEntries(
    memories.map((m) => [m.key, m.value])
  )

  return (
    <main className="flex-1 flex flex-col max-w-3xl mx-auto w-full h-dvh">
      <Chat userName={session.user.name || undefined} memories={memoryMap} />
    </main>
  )
}
