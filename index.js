var reviews = require('./reviews');

module.exports.start = function start(config) {
    for (var i = 0; i < config.apps.length; i++) {
        var app = config.apps[i];

        reviews.start({
            slackHook: config.slackHook,
            verbose: config.verbose,
            dryRun: config.dryRun,
            interval: config.interval,
            botUsername: app.botUsername || config.botUsername,
            botIcon: app.botIcon || config.botIcon,
            botEmoji: app.botEmoji || config.botEmoji,
            showAppIcon: app.showAppIcon || config.showAppIcon,
            channel: app.channel || config.channel,
            publisherKey: app.publisherKey,
            appId: app.appId,
            appName: app.appName,
            regions: app.regions
        })
    }
};
