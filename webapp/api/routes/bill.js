const express = require('express');
const router = express.Router();
const bcrypt = require("bcrypt");
const Regex = require("regex");
const uuidv4 = require('uuid/v4');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
var md5 = require('md5');
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');
const connection =  require('../connection/connection');
const Queries = require('../classes/db');
const Validator = require('../classes/validator');

const auth = require('../classes/auth');

const database = new Queries();
const validator = new Validator();


let s3 = new aws.S3();
aws.config.update({region: 'us-east-2'});
const bucket = process.env.S3_BUCKET_ADDR;
let upload;

upload = multer({
    storage: multerS3({
        s3: s3,
        bucket: bucket,
        acl: 'private',
        contentType: multerS3.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
            cb(null, Date.now() + path.extname(file.originalname));
    }
}),
fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
}
}).single('file');


// Setting up the storage engine
const storage = multer.diskStorage({
    destination: './public/uploads',
    filename: function(req, file, cb){
      cb(null,Date.now() + path.extname(file.originalname));
    }
  });

 
function checkFileType(file, cb){
    // Allowed ext
    const filetypes = /jpeg|jpg|png|pdf|gif/;

    // Check ext
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    // Check mime
    const mimetype = filetypes.test(file.mimetype);
  
    if(mimetype && extname){
      return cb(null,true);
    } else {
      cb('message: This format is not correct, Please choose appropriate format!');
    }
  }

//post method to upload file


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

// GET FILE 


router.get('/bill/:bill_id/file/:fileId', auth.checkAccess,(req, res) => {

    const owner_id = req.ownerId;
    const bill_id = req.params.bill_id; 

    connection.query(database.getABill(owner_id, bill_id), function (err, result, fields) {
        if (err) {
            res.status(404).json({
                message:' No Bill is found, Please choose a Bill' 
                })
                throw err;
        } else {
            if (result[0] == null)
            {
                res.status(404).json({
                message:'No Bill is found, Please choose a Bill' 
                })
            }
            else{
                connection.query(database.getFileById(owner_id, bill_id), function (err, result, fields) {
                    if (err) {
                        res.status(404).json(err);
                        throw err;
                    } else {
                        if (result[0] != null)
                        {
                            res.status(200).json({
                                file_name: result[0].file_name,
                                id: result[0].file_id,
                                url: result[0].url,
                                upload_date: result[0].upload_date
                                
                        })
                          return
                        }
                    res.status(404).json({
                        message: "File not found, please check the id" 
                    });
                    }
                });
            }
        }
        });
  });





// POST BILL


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





  // POST FILE

  router.post('/bill/:bill_id/file', auth.checkAccess,(req, res) => {

    const ownerId = req.ownerId;
    const bill_id = req.params.bill_id; 

    connection.query(database.getABill(ownerId, bill_id), function (err, result, fields) {
        if (err) {
            res.status(404).json({
                message:' No Bill is found, Please choose a Bill' 
                })
                throw err;
        } else {
            if ( result[0] == null)
            {
                res.status(404).json({
                message:' No Bill is found, Please choose a Bill' 
                })
            }
            else{
                connection.query(database.getFileById(ownerId, bill_id), function (err, result, fields) {
                    if (err) {
                        res.status(400).json(err);
                        throw err;
                    } else {
                        if (result[0] == null) 
                        {
                            upload(req, res, (err) => {
                                if(err){
                                 res.status(400).json({
                                  message: err
                                  })
                                } else {
                          
                                  if(req.file == undefined){
                                      res.status(400).json({
                                          message: 'Please select a file' 
                                      })
                                  } else {
                                                  const date = new Date();
                                                  const file_id = uuidv4();

                                               fs.readFile('./'+req.file.path, function(err, buf) {
                                                   
                                                connection.query(database.getAddFile(ownerId,bill_id,req.file.filename,req.file.path,req.file.size,file_id,date,md5(buf)), function (err, result, fields) {
                                                        if (err) {
                                                            res.status(400).json(err);
                                                            throw err;
                                                        } else {
                                                            if (result.affectedRows > 0)
                                                            {
                                                                res.status(201).json({
                                                                    file_name: req.file.filename,
                                                                    id: file_id,
                                                                    url: req.file.path,
                                                                    upload_date: date
                                                                })
                                                            }
                                                            else{
                                                            res.status(400).json({
                                                                message: 'Bad Request'  
                                                            })
                                                        }
                                                        }
                                                    });   
                                              });
                                  }
                                }
                              });
                        }

                        // Image already exists in the system
                        else{
                            res.status(400).json({
                                message: "A File already exists in the system", 
                                id: result[0].file_id,
                        })
                    }
                    }
                });
            }
        }
    });
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



    // DELETE THE FILE BY BILL ID
    
    router.delete('/bill/:bill_id/file/:fileId', auth.checkAccess,(req, res) => {

        const owner_id = req.ownerId;
        const bill_id = req.params.bill_id; 
    
        connection.query(database.getABill(owner_id, bill_id), function (err, result, fields) {
            if (err) {
                res.status(404).json({
                    message:'No Bill is found, Please choose a Bill' 
                    })
                    throw err;
            } else {
                if (result[0] == null)
                {
                    res.status(404).json({
                    message:'No Bill is found, Please choose a Bill' 
                    })
                }
                else{
                    const fileId = req.params.fileId; 
                    connection.query(database.getFileById(owner_id, bill_id), function (err, result, fields) {
                        if (err) {
                            res.status(404).json(err);
                            throw err;
                        } else {
                            if (result[0] == null)
                            {
                                res.status(404).json({
                                    message: "File Not Found in the database" 
                                });
                            }
                            else{
                                const url = result[0].url;
                                connection.query(database.deleteFileById(owner_id, bill_id,fileId), function (err, result, fields) {
                                    if (err) {
                                        res.status(404).json("File not Found in the database"); 
                                        throw err;
                                    } else {
                                        
                                        if (result.affectedRows > 0)
                                        {
                                            fs.unlinkSync('./'+url);
                                            res.status(200).json({
                                                message:" File has been deleted successfully"
                                        })
                                            return
                                        }
                                        res.status(404).json({
                                            message: "File Not Found "  
                                    })
                                       
                                    }
                                });
                        }
                        }
                    });
    
                }
            }
            });
      });

    
module.exports = router;

