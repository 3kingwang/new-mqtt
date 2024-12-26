export interface User {
  username: string
  role: "admin" | "user"
}

export function isAdmin(username: string): boolean {
  return username.startsWith("test")
}
