const bcrypt = require('bcryptjs');
const { supabase } = require('./supabase');

const DEMO_USERS = [
  {
    username: 'admin',
    email: 'admin@crm.com',
    password: 'admin123',
    role: 'admin',
  },
  {
    username: 'agent',
    email: 'agent@crm.com',
    password: 'agent123',
    role: 'agent',
  },
];

async function seedUsers() {
  const { count, error: countError } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true });

  if (countError) throw countError;

  if (count > 0) {
    console.log('Database already seeded - skipping demo users');
    return;
  }

  const rows = DEMO_USERS.map((user) => ({
    username: user.username,
    email: user.email,
    password_hash: bcrypt.hashSync(user.password, 10),
    role: user.role,
  }));

  const { error } = await supabase.from('users').insert(rows);

  if (error) throw error;

  console.log('Seeded demo users: admin / agent');
}

module.exports = { seedUsers };
