const Sequelize = require('sequelize');
const validator = require('../validator');
const uuidv4 = require('uuidv4');
const fs = require('fs');
const mime = require('mime');
var dateformat = require("dateformat");
const uploadS3 = require('../uploadS3');

module.exports = function(app) {
    const { Bill, User, File } = require('../db');

    app.post('/v1/bill/:id/file', async (req, res) => {
        try {
            const bid = req.params.id;
            let user = await validator.validateAndGetUser(req, User);
            if (
                !req.files || Object.keys(req.files).length === 0 || !req.files.attachment) {
                throw new Error('file is not uploaded.');
            }
            let bills = await user.getBills({
                where: { id: bid }
            });

            bill = bills[0];
            if (bill.length == 0) {
                throw new Error('Invalid Bill Id');
            }
            const attachments = await File.findAll({
                where: {BillId: bid}
            });

            if( attachments.length !=0) {
                throw  new Error("BillId already exists");
            }

            let ext1 = mime.getExtension(req.files.attachment.mimetype);
            // const a = req.files.at;tachment.mimetype;
            // console.log(a);
            ext1 = ext1.toString().toLowerCase();
            console.log(ext1);
            const types = new Set(["pdf","jpeg","jpg","png"]);
            if (!types.has(ext1)) {
                throw new Error("Incorrect file type" + ext1);
            }

            await req.files.attachment.mv(
                `${__dirname}/../uploads/${bid}-${req.files.attachment.name}`
            );

            const aws_metadata = await uploadS3.upload('uploads',
                `${__dirname}/../uploads/${bid}-${req.files.attachment.name}`
            );

            const aws_metadata_json = JSON.parse(JSON.stringify(aws_metadata));
            console.log(aws_metadata_json);

            const uuid = uuidv4.uuid();
            let attachment_metadata = await File.create({
                id: uuid,
                file_name: req.files.attachment.name,
                mime_type: req.files.attachment.mimetype,
                size: req.files.attachment.size,
                md5: req.files.attachment.md5,
                upload_date: dateformat(new Date(), "yyyy-mm-dd"),
                aws_metadata_etag:aws_metadata_json.ETag,
                url: aws_metadata_json.Location,
                aws_metadata_key: aws_metadata_json.Key,
                aws_metadata_bucket: aws_metadata_json.Bucket

            });


            await fs.unlink(
                `${__dirname}/../uploads/${bid}-${req.files.attachment.name}`,() => {
                    console.log("File deleted");}
            );


            const fileUpload = {
                id: uuid,
                file_name: req.files.attachment.name,
                url: aws_metadata_json.Location,
                upload_date: dateformat(new Date(), "yyyy-mm-dd")
            };

            await Bill.update(
                {attachment : fileUpload},
                {where: {id: bid}}
            );



            await bill.setFile(attachment_metadata);
            res.status(201).send(fileUpload);

        } catch (error) {
            let message = null;
            if (error instanceof Sequelize.ValidationError) {
                message = error.errors[0].message;
            }
            res.status(400).send(message || error.toString());
        }
    });

    app.get('/v1/bill/:bid/file/:fid', async (req, res) => {
            try {
                const bid = req.params.bid;
                const fid = req.params.fid;
                const user = await validator.validateAndGetUser(req, User);
                const bills = await user.getBills({
                    where: { id: bid }
                });

                if (bills.length === 0) {
                    throw new Error('Invalid Bill Id');
                }
                const bill = bills[0];
                //console.log(bill);
                const attachments = await bill.getFile({
                    attributes: { exclude: ['size', 'md5', 'mime_type', 'BillId','aws_metadata_etag','aws_metadata_bucket','aws_metadata_key'] },
                    where: { id: fid }
                });

                if (attachments.length === 0) {
                    throw new Error('Invalid Attachment Id');
                }
                var  getAttachment = attachments.dataValues;
                res.status(200).send(getAttachment);
            } catch (e) {
                res.status(400).send(e.toString());
            }
        }
    );

    app.delete('/v1/bill/:bid/file/:fid', async (req, res) => {
            try {
                const bid = req.params.bid;
                const fid = req.params.fid;
                const user = await validator.validateAndGetUser(req, User);
                const bills = await user.getBills({
                    where: { id: bid }
                });
                if (bills.length === 0) {
                    throw new Error('Invalid Bill Id');
                }
                const bill = bills[0];
                const attachments = await bill.getFile({
                    where: { id: fid }
                });
                if (attachments.length === 0) {
                    throw new Error('Invalid Attachment Id');
                }
                await File.destroy({
                    where: {id: fid, BillId: bid}
                });

                await uploadS3.delete(
                    `uploads/${bid}-${attachments.dataValues.file_name}`
                    );

                await Bill.update(
                    {attachment : {}},
                    {where: {id: bid}}
                );
                // await Bill.destroy({
                //     where: {id: bid}
                // });

                res.status(204).send();
            } catch (e) {
                res.status(400).send(e.toString());
            }
        }
    );
};