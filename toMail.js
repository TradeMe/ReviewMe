const nodemailer = require('nodemailer');
const schedule = require('node-schedule');
const listOfMails = require('./readMails').call();




var smtpTransport = nodemailer.createTransport({
    host: "smtp.gmail.com", // hostname
    secureConnection: true, // use SSL
    port: 465, // port for secure SMTP
    auth: {
        user: "",
        pass: "",
    }
})

const  sendMail = function  (reviews){
    return  schedule.scheduleJob('* * 8-18 * * 0-4', function(){
      
        for (i = reviews.length - 1; i >= 0; --i) {
         
            var mailOptions = {
                from: "<>", // sender address
                to: listOfMails.toString(), // list of receivers
                subject: "Hello ✔", // Subject line
                text: reviews[i], // plaintext body
            }
    
            smtpTransport.sendMail(mailOptions, function(error, response){
                if(error){
                    console.log(error);
                }else{
                    console.log("Message sent: " + response.message);
                }
    
            });
            
            reviews.splice(i, 1); // Remove even numbers
            
          }
    });
    
}

module.exports = sendMail;
