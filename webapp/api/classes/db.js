 
const bcrypt = require('bcrypt');
const uuidv4 = require('uuid/v4');


class DB {

    getAddUserSQL(fName,lName, email,password) {

        const date = new Date();
        const id = uuidv4();
        let hash = bcrypt.hashSync(password, 10)
        let db = `INSERT INTO user(id,fName,lName,email, password,account_created) VALUES('${id}','${fName}','${lName}','${email}','${hash}','${date}')`;
        return db;
    }


    getCheckEmail(email){
        let db = `SELECT * FROM user where email='${email}'`;
        return db;
    }


    getAllUserSQL() {
        let db = `SELECT * FROM user`;
         return db;
     }


    getUpdatedUser(fName,lName, email,password){

        const date = new Date();

        let hash = bcrypt.hashSync(password, 10)
        let db = `update user set fName = '${fName}', lName = '${lName}', password = '${hash}', account_updated = '${date}' where email = '${email}'` ;
        return db;
    } 


    getABill(owner, id){
        let db = `select * from bill where id ='${id}' && owner_id='${owner}'`;
        return db;
    }



    
    getAllBill(owner){
        let db = `select * from bill where owner_id = '${owner}'`;
        return db;
    }


    getAddBill(owner,vendor,billDate,dueDate,amountDue, categories, paymentStatus) {
        const date = new Date();
        let db = `insert into bill(id ,created_ts ,updated_ts, owner_id ,vendor, bill_date, due_date, amount_due, categories, paymentStatus) VALUES('${uuidv4()}', '${date}','${date}','${owner}','${vendor}', '${billDate}', '${dueDate}', '${amountDue}', '${categories}', '${paymentStatus}')`;
        return db;
    }


    deleteBill(owner, id){
        let db = `delete from bill where id ='${id}' && owner_id='${owner}'`;
        return db;
    }

    getUpdateBill(owner,id, vendor, bill_date, due_date, amount_due, categories,paymentStatus)
    {
        const date = new Date();
        let db = `update bill set vendor = '${vendor}', bill_date = '${bill_date}', due_date = '${due_date}', amount_due = '${amount_due}',  categories = '${categories}', paymentStatus = '${paymentStatus}', updated_ts = '${date}' where id = '${id}' and owner_id = '${owner}'` ;
        return db;
    }





}


module.exports = DB;