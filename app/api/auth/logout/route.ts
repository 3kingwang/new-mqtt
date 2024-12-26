import { NextResponse } from "next/server"
import { cookies } from "next/headers"

export async function POST() {
  const cookieStore = await cookies()
  cookieStore.delete("mqtt_username")
  cookieStore.delete("mqtt_password")
  return NextResponse.json({ success: true })
}
