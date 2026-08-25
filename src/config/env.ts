import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_NAME: z.string().default("Children's Care Platform"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
});

function getEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables. Check server logs.");
  }

  return parsed.data;
}

export type Env = z.infer<typeof envSchema>;

let _env: Env | undefined;

export function env(): Env {
  if (!_env) {
    _env = getEnv();
  }
  return _env;
}
