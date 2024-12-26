import { mqttManager } from "@/lib/mqttManager"
import { cookies } from "next/headers"
import { ConnectedClient } from "@/types/mqtt"

export async function GET() {
  const cookieStore = await cookies()
  const username = cookieStore.get("mqtt_username")?.value
  const password = cookieStore.get("mqtt_password")?.value

  if (!username || !password) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    console.log("SSE: Connecting MQTT for user:", username)
    mqttManager.connect(username, password)

    await new Promise((resolve) => setTimeout(resolve, 1000))

    const encoder = new TextEncoder()
    let isStreamClosed = false

    const stream = new ReadableStream({
      start(controller) {
        console.log("SSE: Stream started")
        const initialData = mqttManager.getConnectedClients()
        console.log("SSE: Initial data:", initialData)

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(initialData)}\n\n`)
        )

        const listener = (data: ConnectedClient[]) => {
          if (isStreamClosed) {
            console.log("SSE: Stream is closed, not sending update")
            return
          }

          console.log("SSE: Received update from MQTT manager:", data)
          try {
            const message = `data: ${JSON.stringify(data)}\n\n`
            console.log("SSE: Sending message:", message)
            controller.enqueue(encoder.encode(message))
          } catch (error) {
            console.error("SSE: Stream write error:", error)
            if (!isStreamClosed) {
              isStreamClosed = true
              controller.close()
            }
          }
        }

        mqttManager.on("clientsUpdated", listener)

        return () => {
          console.log("SSE: Cleanup - removing listener")
          isStreamClosed = true
          mqttManager.off("clientsUpdated", listener)
        }
      },
      cancel() {
        console.log("SSE: Stream cancelled")
        isStreamClosed = true
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("SSE setup error:", error)
    return new Response("Internal Server Error", { status: 500 })
  }
}
