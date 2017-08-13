var reviews = require('./reviews');

module.exports.start = function start(config) {
    for (var i = 0; i < config.apps.length; i++) {
        var app = config.apps[i];

        reviews.start({
            slackHook: config.slackHook,
            appId: app.appId,
            publisherKey: app.publisherKey,
            debug: config.verbose,
            dryRun: config.dryRun,
            botUsername: config.botUsername
        })
    }
};