require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, Customer, Vendor, Item, Parameter } = require('../models');

async function seed() {
  await sequelize.sync({ alter: true });

  const passwordHash = await bcrypt.hash('admin123', 10);
  const [admin] = await User.findOrCreate({
    where: { email: 'admin@shoolinilifesciences.com' },
    defaults: { name: 'Admin', passwordHash, role: 'admin', designation: 'ERP Administrator' },
  });

  const [vendor] = await Vendor.findOrCreate({
    where: { name: 'Terravix Life Sciences Pvt. Ltd.' },
    defaults: {
      contactPerson: 'Mrs. Malti Kumari',
      address: '1204, Beliston Avenue, Dhakoli, Zirakpur, Punjab - 140603, India',
      gstNo: '03AANCT1964E1ZD',
      email: 'info@terravix.com',
      phone: '+91 9939749037',
    },
  });

  const [customer] = await Customer.findOrCreate({
    where: { name: 'Sample Diagnostics Pvt. Ltd.' },
    defaults: {
      contactPerson: 'Mr. Rahul Sharma',
      address: 'Industrial Area, Phase 2, Chandigarh',
      gstNo: '04AABCD1234E1ZP',
      email: 'accounts@sampledx.com',
      phone: '+91 9812345678',
    },
  });

  await Item.findOrCreate({
    where: { sku: 'MC-ATCC-19111' },
    defaults: {
      name: 'Listeria monocytogenes ATCC 19111',
      description: 'Passage Third (Packing - 2 sticks)',
      unit: 'kit',
      unitPriceCents: 1470000,
    },
  });

  await Item.findOrCreate({
    where: { sku: 'MC-ATCC-29212' },
    defaults: {
      name: 'Enterococcus faecalis ATCC 29212',
      description: 'Passage First (Packing - 1 Kit)',
      unit: 'kit',
      unitPriceCents: 1420000,
    },
  });

  await Parameter.findOrCreate({
    where: { code: 'PH-01' },
    defaults: { name: 'pH', description: 'IS 3025 (Part 11)', unit: 'test', unitPriceCents: 25000 },
  });

  await Parameter.findOrCreate({
    where: { code: 'TC-01' },
    defaults: { name: 'Total Coliform Count', description: 'IS 1622', unit: 'test', unitPriceCents: 45000 },
  });

  await Parameter.findOrCreate({
    where: { code: 'TDS-01' },
    defaults: { name: 'Total Dissolved Solids (TDS)', description: 'IS 3025 (Part 16)', unit: 'test', unitPriceCents: 30000 },
  });

  console.log('Seed complete.');
  console.log('Login with: admin@shoolinilifesciences.com / admin123');
  console.log(`Vendor #${vendor.id}, Customer #${customer.id} ready to use.`);
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
