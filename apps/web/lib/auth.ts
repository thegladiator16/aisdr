import { auth } from "@clerk/nextjs/server";
import { getUserByClerkId, createUser } from "./db/queries";
import type { User } from "@aisdr/db/schema";

export async function getCurrentUser(): Promise<User | null> {
  try {
    const { userId: clerkId, sessionClaims } = auth();
    if (!clerkId) return null;

    let user = await getUserByClerkId(clerkId);
    if (!user) {
      const email =
        (sessionClaims?.email as string) ?? `${clerkId}@placeholder.com`;
      const fullName = sessionClaims?.name as string | undefined;
      user = await createUser({ clerkId, email, fullName });
    }

    return user;
  } catch {
    return null;
  }
}

export async function requireUser(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}
