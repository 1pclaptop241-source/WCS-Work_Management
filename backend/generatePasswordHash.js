const bcrypt = require('bcryptjs');

async function generateHash() {
  const password = 'admin123'; // Change this to your desired password
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

}

generateHash();