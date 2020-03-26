const Sequelize = require('sequelize');
const validator = require('../validator');
const uuidv4 = require('uuidv4');
const bcrypt = require('bcrypt');
const logger = require('../config/winston');
const SDC = require('statsd-client'), sdc = new SDC({host: 'localhost', port: 8125});

module.exports = function(app) {
  const { User } = require('../db');
  app.post('/v1/user', async (req, res) => {
    let start = Date.now();
    try {
      

      logger.info("User Register Call");
      sdc.increment('POST user');
      const passw = req.body.password;
      validator.checkPasswStrength(passw);
      const hash = await bcrypt.hash(req.body.password, 10);
      let users = await User.create({
        id: uuidv4.uuid(),
        first_name: req.body.first_name,
        last_name: req.body.last_name,
        password: hash,
        email_address: req.body.email_address
      });

      users = users.toJSON();

      delete users.password;
      res.status(201).send(users);
    } catch (error) {
      logger.error(error);
      let message = null;
      if (error instanceof Sequelize.ValidationError) {
        message = error.errors[0].message;
      }
      res.status(400).send(message || error.toString());
    }

    let end = Date.now();
    var elapsed = end - start;
    sdc.timing('Create User response time', elapsed);
  });

  app.get('/v1/user/self', async (req, res) => {
    let start = Date.now();
    try {
      logger.info("User GET Call");
      sdc.increment('GET user');
      let user = await validator.validateAndGetUser(req, User);
      user = user.toJSON();
      delete user.password;
      res.status(200).send(user);
    } catch (error) {
      logger.error(error)
      res.status(400).send(error.toString());
    }
    let end = Date.now();
    var elapsed = end - start;
    sdc.timing('GET V1 USER response time', elapsed);
  });

  app.put('/v1/user/self', async (req, res) => {
    try {
      logger.info("User UPDATE Call");
      sdc.increment('UPDATE user');
      let user = await validator.validateAndGetUser(req, User);

      if (req.body.first_name) {
        user.first_name = req.body.first_name;
      }
      if (req.body.last_name) {
        user.last_name = req.body.last_name;
      }
      if (req.body.password) {
        validator.checkPasswStrength(req.body.password);
        const hash = await bcrypt.hash(req.body.password, 10);
        user.password = hash;
      }
      await user.save();
      res.status(204).send();
    } catch (error) {
      logger.error(error)
      res.status(400).send(error.toString());
    }
  });

  app.get('/check', async (req, res) => {
    res.status(200).json({
      "message": "Check Successful"
    });
  });

  



};
