const bcrypt = require('bcrypt');
const owasp = require('owasp-password-strength-test');
owasp.config({
  allowPassphrases       : false,
  maxLength              : 128,
  minLength              : 8
});

const auth = require('basic-auth');


const checkPasswStrength = password => {
  const passwordTest = owasp.test(password);
  if (passwordTest.strong == false) {
    throw new Error(passwordTest.errors[0]);
  }
  if (passwordTest.length < owasp.config.minLength) {
    throw new Error ('The password must be at least ' + owasp.config.minLength + ' characters long.');
    }
  if (passwordTest.length > owasp.config.maxLength) {
    throw new Error('The password must be fewer than ' + owasp.config.maxLength + ' characters.');
  }
};

const getHashPassword = password => {
  return password;
};

const validateAndGetUser = async (req, User) => {
  const credentials = auth(req);
  if(!credentials){
    throw new Error('Invalid Credentials');}
  if(!credentials.name){
    throw new Error('Invalid username or password');}
  if(!credentials.pass){
    throw new Error('Invalid username or password');}

  const user = await User.findOne({
    where: {
      email_address: credentials.name
    }
  });
  if (!user) {
    throw new Error('Invalid User');
  }
  const getHashPassword = await bcrypt.compare(
      credentials.pass,
      user.password
  );
  if (!getHashPassword) {
    throw new Error('Invalid Credentials');
  }
  return user;
};
module.exports = {checkPasswStrength, getHashPassword, validateAndGetUser};
