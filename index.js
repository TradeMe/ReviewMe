var reviews = require('./reviews');

module.exports.start = function start(config) {
    for (var i = 0; i < config.apps.length; i++) {
        var app = config.apps[i];

        reviews.start({
            interval: config.interval,
            slackHook: config.slackHook,
            appId: app.appId,
            regions: app.regions,
            publisherKey: app.publisherKey,
            verbose: config.verbose,
            dryRun: config.dryRun,
            botUsername: config.botUsername
        })
    }
};