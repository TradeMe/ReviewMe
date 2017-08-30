const controller = require('./reviews');
var FeedSub = require('feedsub');
require('./constants');

exports.startReview = function (config) {

    if (!config.regions) {
        config.regions = ["us"];
    }

    if (!config.interval) {
        config.interval = DEFAULT_INTERVAL_SECONDS
    }

    for (var i = 0; i < config.regions.length; i++) {
        const region = config.regions[i];
        startReviewForRegion(config, region)
    }
};

function startReviewForRegion(config, region) {
    var appInformation = {};
    appInformation.region = region.toUpperCase();
    var firstRun = true;

    config.feed = "https://itunes.apple.com/" + region + "/rss/customerreviews/id=" + config.appId + "/sortBy=mostRecent/xml";

    //add a multiple to each regions interval to prevent spamming the server
    const regionIndex = config.regions.indexOf(region);
    const interval_multiplier = regionIndex * 60;

    //interval must be in minutes for feedsub
    var interval = (config.interval + interval_multiplier) / 60;

    var reader = new FeedSub(config.feed, {
        emitOnStart: true
    });

    reader.on('items', function (entries) {
        if (firstRun) {
            firstRun = false
            if (entries == null || entries.length == 0) return console.log("WARNING: No reviews found for " + config.appId + " (" + region + ")");

            var reviewLength = entries.length;

            updateAppInformation(config, entries, appInformation);

            // Parse existing entries for app information
            for (var i = 0; i < reviewLength; i++) {
                var item = entries[i];
                var review = exports.parseAppStoreReview(item, config, appInformation);
                // Mark any existing reviews as published
                controller.markReviewAsPublished(config, review)
            }

            if (config.dryRun) {
                var lastReview = exports.parseAppStoreReview(entries[entries.length - 2], config, appInformation);
                publishReview(appInformation, config, lastReview, config.dryRun);
            }
        } else {
            onItemsReceived(config, appInformation, entries)
        }
    });

    reader.on('error', function (error) {
        return console.error("ERROR: for new review: " + error);
    });

    reader.readInterval(function (error, entries) {
        console.log("INFO: Fetched App Store reviews for " + config.appId + " (" + region + ")");
    }, interval, true);
}


function onItemsReceived(config, appInformation, items) {
    for (var i = 0; i < items; i++) {
        var item = items[i];
        console.log("INFO: Fetched App Store reviews for " + config.appId);

        if (!item) {
            if (config.verbose) console.log("WARNING: Received null or undefined review");
            return;
        }

        if (isAppInformationEntry(item)) {
            if (config.verbose) console.log("INFO: Received new app information for " + config.appId);
            updateAppInformation(config, item, appInformation);
            return;
        }

        var review = exports.parseAppStoreReview(item, config, appInformation);

        publishReview(appInformation, config, review, false)
    }
}

function publishReview(appInformation, config, review, force) {
    if (!controller.reviewPublished(review) || force) {
        if (config.verbose) console.log("INFO: Received new review: " + review);
        var message = slackMessage(review, config, appInformation);
        controller.postToSlack(message, config);
        controller.markReviewAsPublished(config, review);
    } else if (controller.reviewPublished(config, review)) {
        if (config.verbose) console.log("INFO: Review already published: " + review.text);
    }
}

exports.parseAppStoreReview = function (rssItem, config, appInformation) {
    var review = {};

    review.id = rssItem['id'];
    review.version = reviewAppVersion(rssItem);
    review.title = rssItem.title;
    review.appIcon = appInformation.appIcon;
    review.text = rssItem.content[0];
    review.rating = reviewRating(rssItem);
    review.author = reviewAuthor(rssItem);
    review.link = config.appLink ? config.appLink : appInformation.appLink;
    review.storeName = "App Store";

    return review;
};


var reviewRating = function (review) {
    return review['im:rating'] != null && !isNaN(review['im:rating']) ? parseInt(review['im:rating']) : -1;
};

var reviewAuthor = function (review) {
    return review.author != null ? review.author.name : '';
};

var reviewAppVersion = function (review) {
    return review['im:version'] != null ? review['im:version'] : '';
};

// App Store app information
var updateAppInformation = function (config, entries, appInformation) {
    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];

        if (!isAppInformationEntry(entry)) continue;

        if (config.appName == null && entry['im:name'] != null) {
            appInformation.appName = entry['im:name'];
        }

        if (config.appIcon == null && entry['im:image'] && entry['im:image'].length > 0) {
            appInformation.appIcon = entry['im:image'][0].text;
        }

        if (config.appLink == null && entry['link']) {
            appInformation.appLink = entry['link'].href;
        }
    }
};

var isAppInformationEntry = function (entry) {
    // App information is available in an entry with some special fields
    return entry != null && entry['im:name'];
};


var slackMessage = function (review, config, appInformation) {
    if (config.verbose) console.log("INFO: Creating message for review " + review.title);

    var stars = "";
    for (var i = 0; i < 5; i++) {
        stars += i < review.rating ? "★" : "☆";
    }

    var color = review.rating >= 4 ? "good" : (review.rating >= 2 ? "warning" : "danger");

    var text = "";
    text += review.text + "\n";

    var footer = "";
    if (review.version) {
        footer += " for v" + review.version;
    }

    if (review.link) {
        footer += " - " + "<" + review.link + "|" + appInformation.appName + ", " + review.storeName + " (" + appInformation.region + ") >";
    } else {
        footer += " - " + appInformation.appName + ", " + review.storeName + " (" + appInformation.region + ")";
    }

    var title = stars;
    if (review.title) {
        title += " – " + review.title;
    }

    return {
        "username": config.botUsername,
        "icon_url": config.botIcon,
        "channel": config.channel,
        "attachments": [
            {
                "mrkdwn_in": ["text", "pretext", "title"],
                "color": color,
                "author_name": review.author,

                "thumb_url": review.appIcon ? review.appIcon : appInformation.appIcon,

                "title": title,
                "text": text,
                "footer": footer
            }
        ]
    };
};
