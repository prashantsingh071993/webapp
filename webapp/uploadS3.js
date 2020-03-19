const logger = require('../webapp/config/winston');
const SDC = require('statsd-client'), sdc = new SDC({host: 'localhost', port: 8125});

const BUCKET_NAME = process.env.S3_BUCKET_ADDR;
//const BUCKET_NAME = "codedeploy.singhprasha.me"; //local

var AWS = require('aws-sdk');

// For local only
//  var s3 = new AWS.S3({
//      accessKeyId: "AKIAIJ5IZMAG2DVBOG7A",
//      secretAccessKey: "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"
//   });

var s3 = new AWS.S3();

var fs = require('fs');
var path = require('path');

 function uploadToS3(keyPrefix, filePath) {

    var fileName = path.basename(filePath);
    var fileStream = fs.createReadStream(filePath);
    var keyName = path.join(keyPrefix, fileName);

    return new Promise(function(resolve, reject) {
        let start = Date.now(); 
        fileStream.once('error', reject);
        s3.upload(
            {
                Bucket: BUCKET_NAME,
                Key: keyName,
                Body: fileStream
            },
            function(err, result) {
                if (err) {
                    reject(err);
                    return;

                }

                resolve(result);
                return result;
            }
        );
        let end = Date.now();
        var elapsed = end - start;
        sdc.timing('Upload TO S3 response time', elapsed);
    });


};

async function deleteFromS3(filename) {
    let start = Date.now();
    logger.info(filename);
    console.log("filename ", filename);

    const params = {
        Bucket: BUCKET_NAME,
        Key: filename 
    };
    try {
        await s3.headObject(params).promise();
        console.log("File Found in the Bucket");
        try {
            await s3.deleteObject(params).promise();
            console.log("file has been deleted Successfully");
        }
        catch (err) {
            console.log("ERROR in Deleting the file : " + JSON.stringify(err));
        }
    } catch (err) {
        console.log("File not Found : " + err.code);
    }
    let end = Date.now();
    var elapsed = end - start;
    sdc.timing('DELETE FROM S3 response time', elapsed);

};

module.exports = { upload: uploadToS3, delete: deleteFromS3};