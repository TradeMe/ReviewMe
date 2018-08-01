var CronJob = require('cron').CronJob;
let emailService = require('./mywork/Service/EmailService');
var job = new CronJob('00 00 8 * * 1-5', function () {
    /*
     * Runs every weekday (Monday through Friday)
     * at 8:00:00 AM. It does not run on Saturday
     * or Sunday.
     */
    // get the saved reviews and email list 
    emailService.send(review, emailList);
}, function () {
    /* This function is executed when the job stops */


},
    true, /* Start the job right now */
);
job.start();