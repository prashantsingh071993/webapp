const util = require('util');
const mysql = require('mysql');
const uuidv4 = require('uuid/v4');


const pool = mysql.createPool({
    connnectionLimit: 10,
    host: 'localhost',
    user: 'root',
    password: 'root',
    database: 'cloud6225'
    
});



pool.getConnection((err, connection) => {

    if(err)
        console.error("something went wrong");

    else {
        connection.query('create table if not exists user(id varchar(200),fName varchar(200),lName varchar(200),email varchar(200), password varchar(200),account_created varchar(200), account_updated varchar(200))', (error, data) => {
            if (error)
                throw error;
            else
                console.log('User table has been created');
        });


        connection.query('create table if not exists bill(id varchar(100), created_ts varchar(100), updated_ts varchar(100), owner_id varchar(100), vendor varchar(100), bill_date varchar(100), due_date varchar(100), amount_due DOUBLE, categories varchar(100), paymentStatus varchar(100))', (error, data) => {
            if (error){
                throw error;
                console.log(error);
            }
            else
                console.log('Bill table has been created');
        });

    }
});






pool.query = util.promisify(pool.query);

module.exports = pool;