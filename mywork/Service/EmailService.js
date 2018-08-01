const fs = require('fs');
const underscore = require("underscore");
const nodemailer = require('nodemailer');

const EmailService = function () {

    underscore.templateSettings = {
        interpolate: /\{\{(.+?)\}\}/g
    };

    const getHtml = function (model) {
        var path = './templates/EmailTemplate.html';
        var html = fs.readFileSync(path, encoding = 'utf8');
        var template = underscore.template(html);
        return template(model);
    }

    const send = function (review, mailList) {
        var model = {
            title: 'Review Me',
            subTitle: 'here is a new Review !',
            review: review
        }
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'mail@gmail.com',
                pass: 'password'
            }
        });

        var mailOptions = {
            from: 'reviewme@gmail.com',
            to: mailList,
            subject: 'review Me',
            html: getHtml(model)
        };

        transporter.sendMail(mailOptions);
    }

    return {
        send: send
    }
}

module.exports = new EmailService();