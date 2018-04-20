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
            botUsername: app.botUsername || config.botUsername,
            botEmoji: app.botEmoji || config.botEmoji,
            channel: app.channel || config.channel
        })
    }
};
