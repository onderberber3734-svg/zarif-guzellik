import { createClient } from '@supabase/supabase-js'

// DİKKAT: Bu dosya yalnızca SERVER ACTIONS üzerinde kullanılmalıdır.
// Client tarafına (tarayıcıya) ASLA gönderilmemelidir.
export function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!, // RLS'i Dikkate Almayan Süper Yetki Anahtarı
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        }
    )
}
