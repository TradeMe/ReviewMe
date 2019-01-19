var reviews = require('./reviews');

module.exports.start = function start(config) {
    for (var i = 0; i < config.apps.length; i++) {
        var app = config.apps[i];

        reviews.start({
            slackHook: config.slackHook,
            verbose: config.verbose,
            dryRun: config.dryRun,
            interval: config.interval,
            botIcon: app.botIcon || config.botIcon,
            showAppIcon: app.showAppIcon || config.showAppIcon,
            channel: app.channel || config.channel,
            publisherKey: app.publisherKey,
            appId: app.appId,
            appName: app.appName,
            regions: app.regions
        })
    }
};

var config = {
    "slackHook": "https://hooks.slack.com/services/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",
    "verbose": true,
    "dryRun": false,
    "showAppIcon": false,
    "interval":300,
    "apps": [
        {
            "botIcon": "https://d3j72de684fey1.cloudfront.net/resized/a450ccf60e0b0fc9aba5e1309daa9d5cffcf0f62.PjI1NngyNTY.png",
            "appId": "1448299719",
            regions: false,
        }
    ]
}

module.exports.start(config);
