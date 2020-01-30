const bcrypt = require('bcrypt');
const connection =  require('../connection/connection');
const Queries = require('../classes/db');

const database = new Queries();

let checkAccess = (req, res, next) =>{
    let auth = req.headers['authorization'];
    if(!auth) {
        res.status(401).json({ "message": "Please login"});
    }else if(auth) {
        let tmp = auth.split(' ');
        let plain_auth = Buffer.from(tmp[1], 'base64').toString();
        let creds = plain_auth.split(':');
        let email = creds[0];
        let password = creds[1];
        if(email!=""&& password!="") {
            connection.query(database.getCheckEmail(email), function (err, result, fields) {
                if (result[0] == null) {
                    return res.status(401).json({
                        message: 'Unauthorized : Invalid Username'
                    })
                } else {
                    if (bcrypt.compareSync(password, result[0].password)) {


                        req.ownerId = result[0].id;

                        next();

        

                    } else {
                        return res.status(401).json({
                            message: 'Unauthorized : Invalid Password'
                        });
                    }

                    



                }
            });
        }else{
            res.status(400).json({
                message:"Please enter all the authorization details"
            })
        }
    }
}

module.exports = {
    checkAccess: checkAccess
};