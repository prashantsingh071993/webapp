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


//GET REQUEST

router.get('/self/:email', auth.checkAccess, function (req,res,next)  {

    const email = req.params.email; 

      if (validator.validEmail(email)) {

        connection.query(database.getCheckEmail(email), function (err, result, fields) {
              if (err) {
                  res.status(400).json(result);
                  throw err;
              } else {
                  if (result[0] == null) {

                      res.status(404).json({
                          "message": "User not present in the database "
                      });
                  }
                  else{
                      res.status(200).json({
                      
                      id: result[0].id,   
                      fName: result[0].fName,
                      lName: result[0].lName,
                      email: result[0].email,
                      account_created: result[0].account_created,
                      account_updated: result[0].account_updated,
                  })
              }
              }
          });
      }
      else {
          res.status(400).json({
              "message": "Email Id is not valid"
          })
      }
});


  

//POST REQUEST

router.post('/', (req, res, next) => {


  const  password = req.body.password;
  const  fName = req.body.fName;
  const  lName = req.body.lName;
  const email = req.body.email;



  if (fName !== null && fName.match(/^ *$/) === null && lName !== null && lName.match(/^ *$/) === null && email !== null && email.match(/^ *$/) === null && password !== null && password.match(/^ *$/) === null){ // check if the values are null

    if (validator.validEmail(email)) { // validate the email

      if (validator.validPassword(password)){  // validate the password
        //check if the email address already exists
        connection.query(database.getCheckEmail(email), function (err, result, fields) { 
          if (err) {
              logger.error(err);
              throw err;
              res.status(200).json(result);
          } else { // if not, add the user details in db
              if (result[0] == null) {
                connection.query(database.getAddUserSQL(fName,lName,email,password), function (err, result, fields) {
                      if (err) {
                          logger.error(err);
                          throw err;
                      }
                      res.status(200).json({
                          "message": "Account has been Created Successfully"
                      });
                  });

              } else { 
                  res.status(400).json({
                      "message": "This Email user already exists"
                  })
              }
          }
      })
  } else {
      res.status(400).json({
          "message": "Please enter a different Password make it more strong"
      })
  }
} else {
  res.status(400).json({
      "message": "Please enter a valid Email Id"
  })
}
} else {
res.status(400).json({
  message: "Please enter all details in the field"
})
}



});



// Update Request 


router.put('/self' , auth.checkAccess, (req,res,next) => {


  
  const email = req.body.email; 
  const password = req.body.password;
  const fName = req.body.fName;
  const lName = req.body.lName;




  console.log("I am in put")


  


  if (email != null && password != null) {


    //console.log("email and password is not null");
   if (validator.validEmail(email)) {

   // console.log("email is valid")
       if (validator.validPassword(password)) {

  console.log("password is valid");

            connection.query(database.getUpdatedUser(fName,lName,email,password), function (err, result, fields) {
                if (err) {
                    res.status(400).json(err);
                    throw err;
                } else {
                    res.status(200).json({
                        "message": "User has been updated successfully"
                    });
                }
            });
        }
        else {
            res.status(400).json({
                "message": "Password is weak, Please try a different password"
            })
        }
    }
    else {
        res.status(406).json({
            "message": "emailId is not valid"
        })
    }
}
else
{
    res.status(406).json({
        message: "Please enter all the details"
    })
 }

});


 



module.exports = router;


