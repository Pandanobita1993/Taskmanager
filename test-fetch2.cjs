const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://yzciddxfeyqmlrtlsknz.supabase.co', 'sb_publishable_z9p7un1Zq5UGMf2ShJ72Pg_ANjTg2un');
supabase.from('clients').select('*').then(({ data, error }) => {
  console.log('Error:', error);
  console.log('Data count:', data?.length);
});
