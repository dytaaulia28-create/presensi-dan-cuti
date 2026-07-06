import fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([^#=]+)\s*=\s*(.*)\s*$/);
  if (match) env[match[1].trim()] = match[2].trim();
});

const supabaseUrl = env['VITE_SUPABASE_URL'];
const serviceRoleKey = env['VITE_SUPABASE_SERVICE_ROLE_KEY'];

console.log('Sending raw POST request to auth admin API...');

try {
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey // Use service role key as apikey as well
    },
    body: JSON.stringify({
      email: 'mimi@gmail.com',
      password: '123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Mimi',
        nik: 'H0001',
        gender: 'female',
        role: 'admin'
      }
    })
  });

  console.log('HTTP Status:', response.status);
  console.log('HTTP Status Text:', response.statusText);
  const text = await response.text();
  console.log('Response Body:', text);
} catch (err) {
  console.error('Fetch error:', err);
}
