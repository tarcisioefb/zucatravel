import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const plans = await prisma.tripPlan.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return NextResponse.json(plans)
}

export async function POST(req: Request) {
  const authSession = await auth()
  if (!authSession?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const body = await req.json().catch(() => ({}))
  const plan = await prisma.tripPlan.create({
    data: {
      userId: authSession.user.id,
      title: body.title || "Novo plano de viagem",
    },
  })

  return NextResponse.json(plan)
}
