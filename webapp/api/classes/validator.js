const validator = require("email-validator");


class Validator{

    validEmail(email){
        if(validator.validate(email)){

            console.log('Email address is valid');
            return true;
        }
        else{
            console.log('Please enter a valid emailID');
            return false;
        }

    }


    validPassword(password){
        let regex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[^\w\s]).{8,}$/ 
        //Password matching expression.
     

        if(regex.test(password))
            return true;
        else
            return false;
    }


    isEmpty(val)
    {
        if(val === null || val.match(/^ *$/) !== null)
            return true;
        else
            return false;
    }


   


    




}

module.exports = Validator;