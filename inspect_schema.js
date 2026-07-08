const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function inspect() {
  const { data, error } = await supabase.from('shops').select().limit(0);
  console.log(error); // This will show the error, but if it succeeds, data will be []
  
  // Actually, we can fetch from a generic endpoint, but let's see where shops is defined
}
inspect();
