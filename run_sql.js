const { createClient } = require("@supabase/supabase-js");

require("dotenv").config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const query = `
    ALTER TABLE businesses
    ADD COLUMN IF NOT EXISTS phone TEXT,
    ADD COLUMN IF NOT EXISTS address TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS business_type TEXT,
    ADD COLUMN IF NOT EXISTS onboarding_step INTEGER DEFAULT 1,
    ADD COLUMN IF NOT EXISTS is_onboarding_completed BOOLEAN DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS is_tour_completed BOOLEAN DEFAULT FALSE;
    `;

    // Because supabase JS client does not have generic query, we might need to use RPC,
    // or just copy this into supabase edit by hand using the Supabase Studio port 54323
    // Wait, node-postgres (pg) is generally there. Let's check package.json
}
run();
