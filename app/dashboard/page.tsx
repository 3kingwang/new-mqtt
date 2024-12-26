"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ConnectedClient } from "@/types/mqtt"
import LoadingSpinner from "@/components/LoadingSpinner"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { isAdmin } from "@/types/auth"
import DeviceList from "@/components/DeviceList"

export default function Dashboard() {
  const [clients, setClients] = useState<ConnectedClient[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [username, setUsername] = useState<string>("")

  useEffect(() => {
    // 获取当前用户信息
    const username = document.cookie
      .split("; ")
      .find((row) => row.startsWith("mqtt_username="))
      ?.split("=")[1]

    if (!username) {
      router.push("/")
      return
    }

    setUsername(username)
    setIsAdminUser(isAdmin(username))
  }, [router])

  useEffect(() => {
    let eventSource: EventSource | null = null

    const connectSSE = () => {
      eventSource = new EventSource("/api/mqtt/events")

      eventSource.onopen = () => {
        console.log("SSE connection opened")
      }

      eventSource.onmessage = (event) => {
        try {
          console.log("Received SSE message:", event.data)
          const data = JSON.parse(event.data)
          setClients((prevClients) => {
            const hasChanged =
              JSON.stringify(prevClients) !== JSON.stringify(data)
            if (hasChanged) {
              console.log("Updating clients:", data)
              return data
            }
            return prevClients
          })
          setLoading(false)
        } catch (error) {
          console.error("Parse error:", error)
        }
      }

      eventSource.onerror = (error) => {
        console.error("SSE error:", error)
        eventSource?.close()
        setLoading(false)
      }
    }

    connectSSE()

    return () => {
      if (eventSource) {
        console.log("Closing SSE connection")
        eventSource.close()
      }
    }
  }, [])

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">
          {isAdminUser ? "MQTT 客户端仪表板" : "我的设备"}
        </h1>
        <Button
          variant="outline"
          onClick={async () => {
            await fetch("/api/auth/logout", { method: "POST" })
            router.push("/")
          }}
        >
          退出登录
        </Button>
      </div>

      <DeviceList />

      {clients.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              暂无{isAdminUser ? "连接的客户端" : "设备"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {clients
            .filter((client) => isAdminUser || client.username === username)
            .map((client) => (
              <Card key={client.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium">
                    {client.username}
                  </CardTitle>
                  <Badge variant={client.connected ? "success" : "destructive"}>
                    {client.connected ? "在线" : "离线"}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      ID: {client.id}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      连接时间: {new Date(client.connectedAt).toLocaleString()}
                    </p>
                    {client.lastMessage && (
                      <div className="mt-4 bg-muted/50 p-3 rounded-md space-y-1">
                        <p className="text-sm font-medium">最新消息</p>
                        <p className="text-sm font-mono break-all">
                          主题: {client.lastMessage.topic}
                        </p>
                        <p className="text-sm font-mono break-all">
                          内容: {client.lastMessage.message}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          时间:{" "}
                          {new Date(
                            client.lastMessage.timestamp
                          ).toLocaleTimeString()}
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  )
}
