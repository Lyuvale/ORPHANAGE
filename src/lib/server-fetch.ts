import { cookies } from "next/headers";

export async function serverFetch(
  url: string,
  options?: RequestInit,
): Promise<Response> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  return fetch(url, {
    ...options,
    headers: {
      Cookie: cookieHeader,
      ...options?.headers,
    },
  });
}
