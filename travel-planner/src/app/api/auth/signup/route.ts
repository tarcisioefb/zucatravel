import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

export async function POST(req: Request) {
  try {
    const { email, name, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email e senha obrigatórios" },
        { status: 400 }
      )
    }

    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      return NextResponse.json(
        { error: "Email já cadastrado" },
        { status: 400 }
      )
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { email, name: name || null, password: hashed },
    })

    return NextResponse.json({ id: user.id, email: user.email, name: user.name })
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erro ao cadastrar" },
      { status: 500 }
    )
  }
}
