import { currentUser } from "@clerk/nextjs/server";

export type Role = "viewer" | "admin";

export async function getCurrentRole(): Promise<Role> {
  const user = await currentUser();
  return user?.publicMetadata?.role === "admin" ? "admin" : "viewer";
}
