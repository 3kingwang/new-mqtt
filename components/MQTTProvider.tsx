"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"
import useMQTTStore from "@/stores/mqttStore"

export default function MQTTProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const { authenticated, init } = useMQTTStore()

  useEffect(() => {
    if (!authenticated) {
      router.push("/login")
    } else {
      init()
    }
  }, [authenticated, init, router])

  return <>{children}</>
}
