import { mkdir, copyFile, writeFile, readFile } from 'node:fs/promises';
const env = { ...process.env };
try { for (const line of (await readFile('../.env', 'utf8')).split(/\r?\n/)) {
 const match = line.match(/^([A-Z_]+)=(.*)$/); if(match && !env[match[1]]) env[match[1]]=match[2].trim().replace(/^['"]|['"]$/g,'');
} } catch {}
if(!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY) throw Error('Cần cấu hình VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trên Vercel.');
await mkdir('dist',{recursive:true});
for(const file of ['index.html','style.css','app.js','core.js']) await copyFile(file, 'dist/'+file);
// Chỉ cấu hình công khai dành cho trình duyệt; không dùng service_role key.
await writeFile('dist/config.js','export default '+JSON.stringify({url:env.VITE_SUPABASE_URL,key:env.VITE_SUPABASE_ANON_KEY})+';');
console.log('Management site built.');
