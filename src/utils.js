const fs = require('fs');

const createFolder = function (path) {
  if (!fs.existsSync(path)) {
    fs.mkdirSync(path)
  }
}

const loginCheck = function () {
  let res = {};
  let hasLoggedIn = false;
  let expired = false;
  let token = null;
  try {
    const loginInfo = JSON.parse(fs.readFileSync('../result/control_token.json', { encoding: 'utf-8' }));
    const now = Date.parse( new Date()) / 1000; // Timestemp in second level

    // Check if expires
    if (now - loginInfo.created_at > loginInfo.expires_in) {
      expired = true;
      hasLoggedIn = false;
    } else {
      hasLoggedIn = true;
      token = loginInfo.access_token;
    }

  } catch (err) {
    console.log('no login');
  }

  res.status = hasLoggedIn;
  res.msg = expired ? 'expired' : null;
  res.data = token;

  return res;
}

// Check login by app.js variables, do not need to read file so its a little bit faster than login check
// Use after application started
const loginFastCheck = function (loginInfo) {
  let res = {};
  let hasLoggedIn = false;
  let expired = false;
  let token = null;

  const now = Date.parse( new Date()) / 1000; // Timestemp in second level

  // Check if expires
  if (now - loginInfo.created_at > loginInfo.expires_in) {
    expired = true;
    hasLoggedIn = false;
  } else {
    hasLoggedIn = true;
    token = loginInfo.access_token;
  }

  res.status = hasLoggedIn;
  res.msg = expired ? 'expired' : null;
  res.data = token;

}

module.exports = {
  createFolder,
  loginCheck,
  loginFastCheck
}