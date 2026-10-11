const { createClient } = require('@supabase/supabase-js');
const s = createClient('https://yzciddxfeyqmlrtlsknz.supabase.co', 'sb_publishable_z9p7un1Zq5UGMf2ShJ72Pg_ANjTg2un');
s.from('clients').select('*').then(res => console.dir(res.data, {depth: null}));
