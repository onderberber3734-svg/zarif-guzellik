require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

async function fixExisting() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing SUPABASE credentials in .env.local");
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update all existing businesses to completed
    const { data, error } = await supabase
        .from('businesses')
        .update({ is_onboarding_completed: true, is_tour_completed: true })
        .eq('is_onboarding_completed', false);

    if (error) {
        console.error("Error updating existing businesses:", error.message);
    } else {
        console.log("Successfully marked existing accounts as completed.");
    }
}

fixExisting();
