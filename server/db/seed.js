const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('./database');

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

function seedUsers() {
  const count = db.prepare('SELECT COUNT(*) AS count FROM users').get().count;

  if (count > 0) {
    console.log('Database already seeded — skipping demo users');
    return;
  }

  const insert = db.prepare(`
    INSERT INTO users (id, username, email, password_hash, role)
    VALUES (@id, @username, @email, @password_hash, @role)
  `);

  const seedMany = db.transaction((users) => {
    for (const user of users) {
      insert.run({
        id: uuidv4(),
        username: user.username,
        email: user.email,
        password_hash: bcrypt.hashSync(user.password, 10),
        role: user.role,
      });
    }
  });

  seedMany(DEMO_USERS);
  console.log('Seeded demo users: admin / agent');
}

module.exports = { seedUsers };
