require('dotenv').config();
const { sequelize, Size, User } = require('../models');

const SIZE_NAMES = ['S', 'M', 'L', 'XL', 'XXL'];

async function seed() {
  await sequelize.sync();

  for (const name of SIZE_NAMES) {
    await Size.findOrCreate({ where: { name } });
  }

  const adminEmail = process.env.ADMIN_EMAIL || 'admin@menz.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin123!';

  const existingAdmin = await User.findOne({ where: { email: adminEmail } });
  if (!existingAdmin) {
    await User.create({
      first_name: 'Store',
      last_name: 'Admin',
      email: adminEmail,
      password: adminPassword,
      phone: '+32 400 00 00 00',
      street: 'Main Street',
      house_number: '1',
      postal_code: '1000',
      city: 'Brussels',
      role: 'admin',
    });
    console.log(`Admin account created: ${adminEmail}`);
  } else {
    console.log('Admin account already exists, skipping.');
  }

  console.log('Seeding complete.');
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
