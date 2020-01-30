const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt");
const Regex = require("regex");
const uuidv4 = require('uuid/v4');

const connection =  require('../connection/connection');
const Queries = require('../classes/db');
const Validator = require('../classes/validator');

const auth = require('../classes/auth');

const database = new Queries();
const validator = new Validator();


// get all the bills

router.get('/bills', auth.checkAccess, (req,res,next) => {

    
    const owner_id = req.ownerId; 
            connection.query(database.getAllBill(owner_id), function (err, result, fields) {
                if (err) {
                    res.status(400).json(err);
                    throw err;
                } else {
                        res.status(200).json({
                            result: result
                    })
           
                }

            });
});

// get bill by id


router.get('/bill/:billId', auth.checkAccess, (req,res,next) => {
    
    const billId = req.params.billId; 
    const ownerId = req.ownerId; 

            connection.query(database.getABill(ownerId, billId), function (err, result, fields) {
                if (err) {
                    res.status(400).json(err);
                    throw err;
                } else {
                        res.status(200).json({
                            result: result
                    })
                }
            });
        

});





router.post('/bill',auth.checkAccess, (req, res, next) => {

    
    const owner = req.ownerId;
    const vendor = req.body.vendor; 
    const bill_date = req.body.bill_date;
    const due_date = req.body.due_date;
    const amount_due = req.body.amount_due;
    const categories = req.body.categories.join();
    const paymentStatus = req.body.paymentStatus;





  if (!validator.isEmpty(vendor) && !validator.isEmpty(bill_date) && !validator.isEmpty(due_date)  && !validator.isEmpty(categories) && !validator.isEmpty(paymentStatus) && amount_due > 0) {




    connection.query(database.getAddBill(owner, vendor, bill_date, due_date , amount_due, categories, paymentStatus), function (err, result, fields) {
                  if (err) {
                    res.status(400).json({
                        message: err
                    })
                    throw err;
                  } else {
                    res.status(202).json({
                        "message": "Bill has been Created"
                    });
                  }
              })
  } else {
      res.status(400).json({
          message: "Please enter all details Properly"
      })
  }

  });





// Update Request 

router.put('/bill/:billID',auth.checkAccess,(req,res,next) => {
    
  
    const vendor = req.body.vendor; 
    const bill_date = req.body.bill_date;
    const due_date = req.body.due_date;
    const paymentStatus = req.body.paymentStatus;
    const billID = req.params.billID; 
    const ownerId = req.ownerId;
    const amount_due = req.body.amount_due;
    const categories = req.body.categories.join();


    if (!validator.isEmpty(due_date)  && !validator.isEmpty(categories) && !validator.isEmpty(paymentStatus) && !validator.isEmpty(vendor) && !validator.isEmpty(bill_date) && amount_due > 0) {

    
            connection.query(database.getUpdateBill(ownerId, billID,vendor,bill_date,due_date, amount_due,categories,paymentStatus), function (err, result, fields) {
                if (err) {
                    res.status(400).json({
                        "error": ""
                    });
                    throw err;
                } else {

                   
                    res.status(202).json({
                        "message": "Bill has been updated"
                    });
                }
            });
        }
        else{
                res.status(400).json({
                    "error": ""
                })

        }
      
        
});


// Delete the bill by ID

router.delete('/bill/:billID', auth.checkAccess, (req,res,next) => {
   
    const billID = req.params.billID; 
    const ownerId = req.ownerId; 
            connection.query(database.deleteBill(ownerId, billID), function (err, result, fields) {
                if (err) {
                    res.status(404).json("Id Not Found");
                    throw err;
                } else {
                        res.status(200).json({
                            "message ": 'Bill has been deleted'
                    })
                }
            });
     });




module.exports = router;

