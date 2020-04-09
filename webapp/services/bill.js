const Sequelize = require('sequelize');
const validator = require('../validator');
const uuidv4 = require('uuidv4');
const uploadS3 = require('../uploadS3');
const logger = require('../config/winston');
const AWS = require("aws-sdk");
const BUCKET_NAME = process.env.S3_BUCKET_ADDR;
var dateformat = require("dateformat");
AWS.config.update({region: 'us-east-1'});

/////SQS////
var sqs = new AWS.SQS();
// var create_queue_params = {
//   QueueName: "MyQueue",
//   Attributes: {
//     ReceiveMessageWaitTimeSeconds: "2"
//   }
// };
// var queue_url = "https://sqs.us-east-1.amazonaws.com/806505171853/MyQueue";
var queue_url = process.env.SQS_URL;

logger.info(queue_url);
// sqs.createQueue(create_queue_params, function(err, data) {
//   if (err) {
//     console.error(err);
//   } else {
//     console.log(data);
//     queue_url = data.QueueUrl;
//   }
// });

/// SNS//
// var topic_arn = "arn:aws:sns:us-east-1:806505171853:EmailTopic";
var topic_arn = process.env.SNS_TOPIC;

logger.info(topic_arn);
var createTopicPromise = new AWS.SNS({ apiVersion: "2010-03-31" })
  .createTopic({ Name: "EmailTopic" })
  .promise();

//handled rejects//

createTopicPromise
 .then(function(data) {
    logger.info("Topic ARN is " + data.TopicArn);
    topic_arn = data.TopicArn;
  })
  .catch(function(err) {
    logger.error(err, err.stack);
  });





const SDC = require('statsd-client'), sdc = new SDC({host: 'localhost', port: 8125});


module.exports = function(app) {
const { Bill, User, File } = require('../db');

  app.post('/v1/bill', async (req, res) => {
    let start = Date.now();

    try {
      logger.info("Bill Register Call");
      sdc.increment('Post Bill');
      let user = await validator.validateAndGetUser(req, User);

      let bills = await Bill.create({

        id: uuidv4.uuid(),
        vendor: req.body.vendor,
        bill_date: dateformat(req.body.bill_date, "yyyy-mm-dd"),
        due_date: dateformat(req.body.due_date, "yyyy-mm-dd"),
        amount_due: req.body.amount_due,
        paymentStatus: req.body.paymentStatus,
        categories: req.body.categories,
        attachment: { }
      });

      await user.addBill(bills);

      bills = bills.toJSON();
      res.status(201).send(bills);

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
    sdc.timing('Create Bill response time', elapsed);
  });

  app.get('/v1/bills', async (req, res) => {
    let start = Date.now();
    try {
      logger.info("Bill GET All Call");
      sdc.increment('Get all bill');
      const user = await validator.validateAndGetUser(req, User);
      const bills = await user.getBills();

      res.status(200).send(bills);
    } catch (error) {
      logger.error(error);
      res.status(400).send(error.toString());
    }

    let end = Date.now();
    var elapsed = end - start;
    sdc.timing('GET V1 BILL response time', elapsed);
  });


  app.get('/v2/bills', async (req, res) => {
    let start = Date.now();
    try {
      logger.info("Bill GET All Call");
      sdc.increment('Get all bill');
      const user = await validator.validateAndGetUser(req, User);
      const bills = await user.getBills();

      res.status(200).send(bills);
    } catch (error) {
      logger.error(error);
      res.status(400).send(error.toString());
    }
    let end = Date.now();
    var elapsed = end - start;
    sdc.timing('GET V2 BILL response time', elapsed);
  });

  app.get('/v1/bill/:id', async (req, res) => {
    let start = Date.now();
    try {

      logger.info("Bill GET by ID Call");
      sdc.increment('Get bill by id');
  
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
      logger.error(error);
      res.status(400).send(error.toString());
    }
    let end = Date.now();
    var elapsed = end - start;
    sdc.timing('GET V1 BILL WITH ID response time', elapsed);
  });

  app.delete('/v1/bill/:id', async (req, res) => {
    let start = Date.now();
    try {
      logger.info("Bill Delete Call");
      sdc.increment('Delete bill by id')
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
      logger.error(error);
      res.status(400).send(error.toString());
    }
    let end = Date.now();
    var elapsed = end - start;
    sdc.timing('DELETE BILL WITH ID response time', elapsed);
  });

  app.put('/v1/bill/:id', async (req, res) => {
    try {
      logger.info("Bill PUT Call");
      sdc.increment('Update bill (PUT)')

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
      logger.error(error);
      res.status(400).send(error.toString());
    }
  });

// get bills by email
app.get('/v1/bill/due/:x', async (req, res) => {
  let x = req.params.x;
 try {
   //validating the user
   const user = await validator.validateAndGetUser(req, User);
   function formatDate(date) {
     var d = new Date(date),
         month = "" + (d.getMonth() + 1),
         day = "" + d.getDate(),
         year = d.getFullYear();

     if (month.length < 2) month = "0" + month;
     if (day.length < 2) day = "0" + day;

     return [year, month, day].join("-");
   }

   var current_date = dateformat(new Date(), "yyyy-mm-dd");
   console.log("Current Date is :" + current_date);
   var new_date = new Date().setDate(new Date().getDate() + Number(x));
   var modified_date = formatDate(new_date);
   console.log("End Date is ", modified_date);
   
   const bills = await user.getBills();

   logger.info(bills)
   bill = bills;
   logger.info("testhbszch ajhscvbhszcjkbzcjhzcjzdjczjxcnj"+bill);


   Response_Message = [];
     for (const i in bill) {
       console.log(bill[i].due_date);
       if(bill[i].due_date < modified_date) {
         const message = {url: "https://prod.singhprasha.me/v1/bill/" + bill[i].id};
         Response_Message.push(message);
       }

     }


   const Response = {
     Response_Msg: Response_Message,
     Response_email: user.email_address,
   };

   logger.info("Response Test : " + Response);

   var send_queue_params = {
     MessageBody: JSON.stringify(Response),
     QueueUrl: queue_url,
     DelaySeconds: 0
   };

   sqs.sendMessage(send_queue_params, function(error, data) {
     if (error) {
       logger.error(error);
     } else {
       logger.info(
           "Message to Queue" + JSON.stringify(data)
       );
     }
   });

   
   res.status(200).send("email sent ");

   var receive_queue_params = {
     QueueUrl: queue_url,
     VisibilityTimeout: 0 // 0 min wait time for anyone else to process.
   };
   sqs.receiveMessage(receive_queue_params, function(
       error,
       data
   ) {
     if (error) {
       logger.error(error);
     } else {
       logger.info(
           "Message From Queue" + JSON.stringify(data)
       );

       var params = {
         Message: JSON.stringify(data) /* required */,
         TopicArn: topic_arn
       };

       // Create promise and SNS service object
       var publishTextPromise = new AWS.SNS({
         apiVersion: "2010-03-31"
       })
           .publish(params)
           .promise();

       // Handle promise's fulfilled/rejected states
       publishTextPromise
           .then(function(data) {
             logger.info(
                 `Message ${params.Message}  sent to the topic ${params.TopicArn}`
             );
             logger.info("MessageID is " + JSON.stringify(data));
           })
           .catch(function(err) {
             logger.error(err, err.stack);
           });
     }
   });

  } catch (e) {
    res.status(400).send(e.toString());
    logger.error({ error: e.toString() });
   }
});














};
