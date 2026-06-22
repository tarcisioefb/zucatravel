import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { id } = await params
  const plan = await prisma.tripPlan.findFirst({
    where: { id, userId: session.user.id },
  })

  if (!plan) {
    return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 })
  }

  return NextResponse.json(plan)
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { id } = await params
  const body = await req.json()

  const plan = await prisma.tripPlan.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!plan) {
    return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 })
  }

  const updated = await prisma.tripPlan.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.messages !== undefined && { messages: body.messages }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const { id } = await params
  const plan = await prisma.tripPlan.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!plan) {
    return NextResponse.json({ error: "Plano não encontrado" }, { status: 404 })
  }

  await prisma.tripPlan.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
