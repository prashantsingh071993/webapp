var expect  = require('chai').expect;
var request = require('request');
const bcrypt = require("bcrypt");



describe("Should save user in DB", function () {
    it("Should save a user to the DB", function (done) {
        var hashedPassword = bcrypt.hashSync(payloadForTest.password, 8);
        delete payloadForTest.password;
        payloadForTest.password = hashedPassword

        test-pages.createUsers(payloadForTest, function (error, result) {
            expect(error).to.be.null
            expect(result).to.be.not.null
            done();
        })
    });
})