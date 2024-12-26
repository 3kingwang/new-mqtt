import { NextResponse } from "next/server"
import { isAdmin } from "@/types/auth"

export async function POST(request: Request) {
  const { username, password } = await request.json()

  if (username && password) {
    const response = NextResponse.json({
      success: true,
      isAdmin: isAdmin(username),
    })

    response.cookies.set({
      name: "mqtt_username",
      value: username,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    })

    response.cookies.set({
      name: "mqtt_password",
      value: password,
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
    })

    return response
  }

  return NextResponse.json({ success: false }, { status: 401 })
}
