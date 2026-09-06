const User = require('../models/User');

const bootstrapAdmin = async () => {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminName = process.env.ADMIN_NAME || 'System Admin';

  if (!adminEmail || !adminPassword) {
    return;
  }

  const existingAdmin = await User.findOne({ email: adminEmail, role: 'admin' });

  if (existingAdmin) {
    return;
  }

  await User.create({
    name: adminName,
    email: adminEmail,
    password: adminPassword,
    role: 'admin',
  });

  console.log('Default admin account created');
};

module.exports = bootstrapAdmin;