import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  try {
    const { key, value } = await req.json()
    if (!key || !value) {
      return NextResponse.json(
        { error: "key e value obrigatórios" },
        { status: 400 }
      )
    }

    const memory = await prisma.memory.upsert({
      where: {
        userId_key: { userId: session.user.id, key },
      },
      update: { value },
      create: {
        userId: session.user.id,
        key,
        value,
      },
    })

    return NextResponse.json(memory)
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao salvar" },
      { status: 500 }
    )
  }
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  const memories = await prisma.memory.findMany({
    where: { userId: session.user.id },
  })

  return NextResponse.json(
    Object.fromEntries(memories.map((m) => [m.key, m.value]))
  )
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 })
  }

  try {
    const { key } = await req.json()
    if (!key) {
      return NextResponse.json({ error: "key obrigatória" }, { status: 400 })
    }

    await prisma.memory.deleteMany({
      where: { userId: session.user.id, key },
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao deletar" },
      { status: 500 }
    )
  }
}
