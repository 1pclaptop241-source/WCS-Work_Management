const webpush = require('web-push');
const fs = require('fs');

const keys = webpush.generateVAPIDKeys();
fs.writeFileSync('vapid_keys.json', JSON.stringify(keys, null, 2));
// Logs removed
