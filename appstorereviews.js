const controller = require('./reviews');
var request = require('request');
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

        const appInformation = {};
        appInformation.region = region;

        exports.fetchAppStoreReviews(config, appInformation, function (entries) {
            var reviewLength = entries.length;

            for (var i = 0; i < reviewLength; i++) {
                var initialReview = entries[i];
                controller.markReviewAsPublished(config, initialReview);
            }

            if (config.dryRun && entries.length > 0) {
                publishReview(appInformation, config, entries[entries.length - 1], config.dryRun);
            }

            //calculate the interval with an offset, to avoid spamming the server
            var interval_seconds = config.interval + (i * 10);

            setInterval(function (config, appInformation) {
                if (config.verbose) console.log("INFO: [" + config.appId + "] Fetching Google Play reviews");

                exports.fetchAppStoreReviews(config, region, appInformation, function (reviews) {
                    exports.handleFetchedAppStoreReviews(config, region, appInformation, reviews);
                });
            }, interval_seconds * 1000, config, appInformation);
        });
    }
};

exports.fetchAppStoreReviews = function (config, appInformation, callback) {
    const url = "https://itunes.apple.com/" + appInformation.region + "/rss/customerreviews/id=" + config.appId + "/sortBy=mostRecent/json";

    request(url, function (error, response, body) {
        var rss = JSON.parse(body);
        var entries = rss.feed.entry;

        if (error) {
            if (config.verbose) {
                console.log("ERROR: [" + config.appId + "] Error fetching reviews from App Store");
                console.log(error)
            }
            callback([]);
            return;
        }

        if (!entries) {
            if (config.verbose) console.log("INFO: [" + config.appId + "] Received no reviews from App Store");
            callback([]);
            return;
        }

        if (config.verbose) console.log("INFO: [" + config.appId + "] Received reviews from App Store");

        updateAppInformation(config, entries, appInformation);

        var reviews = entries
            .filter(function (review) {
                return !isAppInformationEntry(review)
            })
            .reverse()
            .map(function (review) {
                return exports.parseAppStoreReview(review, config, appInformation);
            });

        callback(reviews)
    });
};


exports.handleFetchedAppStoreReviews = function (config, appInformation, reviews) {
    if (config.verbose) console.log("INFO: [" + config.appId + "] Handling fetched reviews");
    for (var n = 0; n < reviews.length; n++) {
        var review = reviews[n];
        publishReview(appInformation, config, review, false)
    }
};

exports.parseAppStoreReview = function (rssItem, config, appInformation) {
    var review = {};

    review.id = rssItem.id.label;
    review.version = reviewAppVersion(rssItem);
    review.title = rssItem.title.label;
    review.appIcon = appInformation.appIcon;
    review.text = rssItem.content.label;
    review.rating = reviewRating(rssItem);
    review.author = reviewAuthor(rssItem);
    review.link = config.appLink ? config.appLink : appInformation.appLink;
    review.storeName = "App Store";
    return review;
};

function publishReview(appInformation, config, review, force) {
    if (!controller.reviewPublished(review) || force) {
        if (config.verbose) console.log("INFO: Received new review: " + JSON.stringify(review));
        var message = slackMessage(review, config, appInformation);
        controller.postToSlack(message, config);
        controller.markReviewAsPublished(config, review);
    } else if (controller.reviewPublished(config, review)) {
        if (config.verbose) console.log("INFO: Review already published: " + review.text);
    }
}

var reviewRating = function (review) {
    return review['im:rating'] && !isNaN(review['im:rating'].label) ? parseInt(review['im:rating'].label) : -1;
};

var reviewAuthor = function (review) {
    return review.author ? review.author.name.label : '';
};

var reviewAppVersion = function (review) {
    return review['im:version'] ? review['im:version'].label : '';
};

// App Store app information
var updateAppInformation = function (config, entries, appInformation) {
    for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];

        if (!isAppInformationEntry(entry)) continue;

        if (!config.appName && entry['im:name']) {
            appInformation.appName = entry['im:name'].label;
        }

        if (!config.appIcon && entry['im:image'] && entry['im:image'].length > 0) {
            appInformation.appIcon = entry['im:image'][0].label;
        }

        if (!config.appLink && entry['link']) {
            appInformation.appLink = entry['link'].attributes.href;
        }
    }
};

var isAppInformationEntry = function (entry) {
    // App information is available in an entry with some special fields
    return entry && entry['im:name'];
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
