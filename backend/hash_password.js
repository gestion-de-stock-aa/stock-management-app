const bcrypt = require('bcrypt');

const password = 'admin123'; // هنا حطّ الpassword اللي تحبّ تشفرها
const saltRounds = 10;

bcrypt.hash(password, saltRounds, function(err, hash) {
  if (err) {
    console.error('Error hashing password', err);
  } else {
    console.log('Hashed password:', hash);
  }
});
