import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  browserClient ??= createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  );

  return browserClient;
}

export async function sendMagicLink(email: string): Promise<{
  ok: boolean;
  message: string;
}> {
  const client = getSupabaseBrowserClient();

  if (!client) {
    return {
      ok: false,
      message: "云同步服务尚未配置，当前进度仅保存在本机。",
    };
  }

  try {
    const { error } = await client.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_APP_URL ?? window.location.origin,
      },
    });

    return error
      ? { ok: false, message: error.message }
      : { ok: true, message: "登录链接已发送，请检查邮箱。" };
  } catch {
    return {
      ok: false,
      message: "登录服务暂时不可用，请稍后重试。",
    };
  }
}

