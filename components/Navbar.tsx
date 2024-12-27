"use client"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import useMQTTStore from "@/stores/mqttStore"

export default function Navbar() {
  const router = useRouter()
  const { disconnect, username } = useMQTTStore()

  const handleLogout = () => {
    disconnect()
    router.push("/login")
  }

  return (
    <div className="border-b">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="font-semibold">MQTT 客户端</div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            当前用户: {username}
          </span>
          <Button variant="outline" onClick={handleLogout}>
            退出登录
          </Button>
        </div>
      </div>
    </div>
  )
}
