const Sequelize = require('sequelize');
const validator = require('../validator');
const uuidv4 = require('uuidv4');
const uploadS3 = require('../uploadS3');
const logger = require('../config/winston');
const AWS = require("aws-sdk");
const BUCKET_NAME = process.env.S3_BUCKET_ADDR;

/////SQS////
var sqs = new AWS.SQS();
var create_queue_params = {
  QueueName: "MyQueue",
  Attributes: {
    ReceiveMessageWaitTimeSeconds: "2"
  }
};
var queue_url = "";
sqs.createQueue(create_queue_params, function(err, data) {
  if (err) {
    console.error(err);
  } else {
    console.log(data);
    queue_url = data.QueueUrl;
  }
});

/// SNS//
var topic_arn = "";
var createTopicPromise = new AWS.SNS({ apiVersion: "2010-03-31" })
  .createTopic({ Name: "EmailTopic" })
  .promise();


  //handled rejects//

createTopicPromise
 .then(function(data) {
    console.log("Topic ARN is " + data.TopicArn);
    topic_arn = data.TopicArn;
  })
  .catch(function(err) {
    console.error(err, err.stack);
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
   //nn
   function formatDate(date) {
     var d = new Date(date),
         month = "" + (d.getMonth() + 1),
         day = "" + d.getDate(),
         year = d.getFullYear();

     if (month.length < 2) month = "0" + month;
     if (day.length < 2) day = "0" + day;

     return [year, month, day].join("-");
   }

   var d = new Date();
   console.log("Current Date :" + d);
   var new_date = new Date().setDate(
       new Date().getDate() + Number(req.params.x)
   );
   var formatted_date = formatDate(new_date);
   console.log("Bills Before Date: ", formatted_date);

   const bills = await user.getBills();
      bill = JSON.parse(JSON.stringify(bills));
      console.log(bill);


      Response_Message = [];
        for (const i in bill) {
          console.log(bill[i].due_date);
          if(bill[i].due_date < modified_date) {
            const message = {url: "http://prod.singhprasha.me/v1/bill/" + bill[i].id};
            Response_Message.push(message);
          }

        }


        
   const Response = {
     Response_Msg: Response_Msg,
     Response_email: user.email_address,
     Response_due_date: formatted_date
   };

   var send_queue_params = {
     MessageBody: JSON.stringify(Response),
     QueueUrl: queue_url,
     DelaySeconds: 0
   };

   sqs.sendMessage(send_queue_params, function(error3, data) {
     if (error3) {
       console.error(error3);
     } else {
       console.log(
           "Sent Message From Queue" + JSON.stringify(data)
       );
     }
   });

   console.log("Response: " + JSON.stringify(Response));
   res.status(200).send("Check Your Emails for Due Bills");

   var receive_queue_params = {
     QueueUrl: queue_url,
     VisibilityTimeout: 0 // 0 min wait time for anyone else to process.
   };
   sqs.receiveMessage(receive_queue_params, function(
       error4,
       data2
   ) {
     if (error4) {
       console.error(error4);
     } else {
       console.log(
           "Recived Message From Queue" + JSON.stringify(data2)
       );

       var params = {
         Message: JSON.stringify(data2) /* required */,
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
             console.log(
                 `Message ${params.Message}  sent to the topic ${params.TopicArn}`
             );
             console.log("MessageID is " + JSON.stringify(data));
           })
           .catch(function(err) {
             console.error(err, err.stack);
           });
     }
   });

  } catch (e) {
    res.status(400).send(e.toString());
    logg.error({ error: e.toString() });
   }
});














};
