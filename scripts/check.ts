import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'admin@zarifguzellik.com',
    password: 'password123'
  });
  
  if (authErr) {
    console.log("Auth Failed -> Try second email:", authErr.message);
    const retry = await supabase.auth.signInWithPassword({
        email: 'hello@edepiyot.com',
        password: 'password123'
    });
    if (retry.error) {
        console.log("Retry failed:", retry.error.message);
        return;
    }
  }

  const { data: aps, error } = await supabase.from('appointments').select('id, services:appointment_services(id, service:services(id, name, business_id))').limit(3);
  console.log(JSON.stringify(aps, null, 2));
}
check();
