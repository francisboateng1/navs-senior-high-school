import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';
import bcrypt from 'bcryptjs';
import { getDb } from '../src/config/db.js';
import { initializeDatabase } from '../src/database/init.js';

async function main() {
  await initializeDatabase();
  const db = getDb();

  const args = process.argv.slice(2);
  let fullName = '';
  let email = '';
  let password = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--name' && args[i + 1]) fullName = args[++i];
    if (args[i] === '--email' && args[i + 1]) email = args[++i];
    if (args[i] === '--password' && args[i + 1]) password = args[++i];
  }

  if (!fullName || !email || !password) {
    const rl = readline.createInterface({ input, output });
    fullName = fullName || (await rl.question('Super Administrator Full Name: '));
    email = email || (await rl.question('Super Administrator Email: '));
    password = password || (await rl.question('Password (min 8 chars): '));
    rl.close();
  }

  if (password.length < 8) {
    console.error('Error: Password must be at least 8 characters.');
    process.exit(1);
  }

  const emailLower = email.trim().toLowerCase();
  const passwordHash = await bcrypt.hash(password, 12);

  const existing = await db.queryOne('SELECT id FROM administrators WHERE LOWER(email) = ?', [emailLower]);
  if (existing) {
    await db.execute('UPDATE administrators SET full_name = ?, password_hash = ?, is_active = 1 WHERE id = ?', [
      fullName.trim(),
      passwordHash,
      existing.id,
    ]);
    console.log(`Updated Super Administrator account for ${emailLower}.`);
  } else {
    const res = await db.execute(
      'INSERT INTO administrators (full_name, email, password_hash, is_active) VALUES (?, ?, ?, 1)',
      [fullName.trim(), emailLower, passwordHash]
    );
    const superRole = await db.queryOne('SELECT id FROM roles WHERE slug = ?', ['super_admin']);
    if (superRole) {
      await db.execute('INSERT INTO administrator_role_assignments (administrator_id, role_id) VALUES (?, ?)', [
        res.insertId,
        superRole.id,
      ]);
    }
    console.log(`Created Super Administrator account for ${emailLower} (ID: ${res.insertId}).`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to create administrator:', err);
  process.exit(1);
});
