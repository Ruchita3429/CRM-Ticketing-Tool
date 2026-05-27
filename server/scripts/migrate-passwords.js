const bcrypt = require('bcryptjs');
const { db } = require('../db/database');

const SALT_ROUNDS = 12;

function migratePasswords() {
  const users = db.prepare('SELECT id, username, password_hash FROM users').all();
  const update = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');

  let migrated = 0;

  for (const user of users) {
    const current = user.password_hash || '';
    if (current.startsWith('$2')) continue;

    const hashed = bcrypt.hashSync(current, SALT_ROUNDS);
    update.run(hashed, user.id);
    migrated += 1;
    console.log(`Hashed password for ${user.username}`);
  }

  console.log(`Password migration complete. Updated ${migrated} user(s).`);
}

migratePasswords();
