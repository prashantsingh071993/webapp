const Sequelize = require('sequelize');
const validator = require('../validator');
const uuidv4 = require('uuidv4');
const uploadS3 = require('../uploadS3');
module.exports = function(app) {
const { Bill, User, File } = require('../db');

  app.post('/v1/bill', async (req, res) => {
    try {
      let user = await validator.validateAndGetUser(req, User);

      let bills = await Bill.create({

        id: uuidv4.uuid(),
        vendor: req.body.vendor,
        bill_date: req.body.bill_date,
        due_date: req.body.due_date,
        amount_due: req.body.amount_due,
        paymentStatus: req.body.paymentStatus,
        categories: req.body.categories,
        attachment: { }
      });

      await user.addBill(bills);

      bills = bills.toJSON();
      res.status(201).send(bills);

    } catch (error) {
      let message = null;
      if (error instanceof Sequelize.ValidationError) {
        message = error.errors[0].message;
      }
      res.status(400).send(message || error.toString());
    }
  });

  app.get('/v1/bills', async (req, res) => {
    try {
      const user = await validator.validateAndGetUser(req, User);
      const bills = await user.getBills();

      res.status(200).send(bills);
    } catch (error) {
      res.status(400).send(error.toString());
    }
  });

  app.get('/v1/bill/:id', async (req, res) => {
    try {
      const user = await validator.validateAndGetUser(req, User);
      const id = req.params.id;
      const bills = await user.getBills({
        where: {id: id}
      });
      if (bills === undefined || bills.length == 0) {
        throw new Error('Bill ID is not correct');
      }
      bill = bills[0];
      const file = await File.findOne({
        where: {BillId: id},
        attributes: { exclude: ['size', 'md5', 'mime_type', 'BillId','aws_metadata_etag','aws_metadata_bucket','aws_metadata_key'] }
      });

      const file_attachment  = {
        attachment : file
      };

      bill_update = bill.dataValues;
      ba = { ...bill_update, ...file_attachment };
      res.status(200).send(ba);
    } catch (error) {
      res.status(400).send(error.toString());
    }
  });

  app.delete('/v1/bill/:id', async (req, res) => {
    try {
      const user = await validator.validateAndGetUser(req, User);
      const id = req.params.id;
      const bills = await user.getBills({
        where: { id: id }
      });
      if (bills === undefined || bills.length == 0) {
        throw new Error('Bill ID is not correct');
      }
      const bill = bills[0];

      const attachments = await bill.getFile({
        where: {BillId: id }
      });
      if (attachments.length === 0) {
        throw new Error('Invalid file Id');
      }

      await user.removeBill(bill);

      await File.destroy({
        where: {BillId: id}
      });
      await uploadS3.delete(
          `uploads/${id}-${attachments.dataValues.file_name}`
      );
      await bill.destroy();
      res.sendStatus(204);
    } catch (error) {
      res.status(400).send(error.toString());
    }
  });

  app.put('/v1/bill/:id', async (req, res) => {
    try {
      const user = await validator.validateAndGetUser(req, User);
      const id = req.params.id;
      const bills = await user.getBills({
        where: { id: id }
      });
      if (bills === undefined || bills.length == 0) {
        throw new Error('Bill ID is not correct');
      }
      const bill = bills[0];

      if (req.body.vendor) {
        bill.vendor = req.body.vendor;
      }
      if (req.body.bill_date) {
        bill.bill_date = req.body.bill_date;
      }
      if (req.body.due_date) {
        bill.due_date = req.body.due_date;
      }
      if (req.body.amount_due < 0.01) {
        throw new Error("Amount due cannot be less than 0.01");
      }
      else{
        bill.amount_due = req.body.amount_due;
      }
      if (req.body.paymentStatus) {
        bill.paymentStatus = req.body.paymentStatus;
      }
      if (req.body.categories) {
        bill.categories = req.body.categories;
      }
      if (req.body.attachment){
        throw new Error("Cannot update file");
      }

      await bill.save();
      res.sendStatus(204);
    } catch (error) {
      res.status(400).send(error.toString());
    }
  });
};
