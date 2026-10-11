const { createClient } = require('@supabase/supabase-js');
const url = 'https://yzciddxfeyqmlrtlsknz.supabase.co';
const key = 'sb_publishable_z9p7un1Zq5UGMf2ShJ72Pg_ANjTg2un';
const supabase = createClient(url, key);

async function test() {
  const { data, error } = await supabase.from('app_users').insert([{ name: 'Test', department: 'Kế toán', roles: [] }]);
  console.log('Error:', error);
  console.log('Data:', data);
}
test();
