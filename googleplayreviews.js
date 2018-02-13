const controller = require('./reviews');
var google = require('googleapis');
var playScraper = require('google-play-scraper');

exports.startReview = function (config) {
    var appInformation = {};

    //scrape Google Play for app information first
    playScraper.app({appId: config.appId})
        .then(function (appData, error) {
            if (error) {
                return console.error("ERROR: [" + config.appId + "] Could not scrape Google Play, " + error);
            }

            appInformation.appName = appData.title;
            appInformation.appIcon = 'https:' + appData.icon;

            exports.fetchGooglePlayReviews(config, appInformation, function (entries) {
                var reviewLength = entries.length;

                for (var i = 0; i < reviewLength; i++) {
                    var initialReview = entries[i];
                    controller.markReviewAsPublished(config, initialReview);
                }

                if (config.dryRun && entries.length > 0) {
                    publishReview(appInformation, config, entries[entries.length - 1], config.dryRun);
                }

                var interval_seconds = config.interval ? config.interval : DEFAULT_INTERVAL_SECONDS;

                setInterval(function (config, appInformation) {
                    if (config.verbose) console.log("INFO: [" + config.appId + "] Fetching Google Play reviews");

                    exports.fetchGooglePlayReviews(config, appInformation, function (reviews) {
                        exports.handleFetchedGooglePlayReviews(config, appInformation, reviews);
                    });
                }, interval_seconds * 1000, config, appInformation);
            });

        });
};


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

exports.handleFetchedGooglePlayReviews = function (config, appInformation, reviews) {
    if (config.verbose) console.log("INFO: [" + config.appId + "] Handling fetched reviews");
    for (var n = 0; n < reviews.length; n++) {
        var review = reviews[n];
        publishReview(appInformation, config, review, false)
    }
};


exports.fetchGooglePlayReviews = function (config, appInformation, callback) {
    if (config.verbose) console.log("INFO: Fetching Google Play reviews for " + config.appId);

    const scopes = ['https://www.googleapis.com/auth/androidpublisher'];

    //read publisher json key
    var publisherJson;
    try {
        publisherJson = JSON.parse(require('fs').readFileSync(config.publisherKey, 'utf8'));
    } catch (e) {
        console.warn(e)
    }

    var jwt;
    try {
        jwt = new google.auth.JWT(publisherJson.client_id, null, publisherJson.private_key, scopes, null);
    } catch (e) {
        console.warn(e)
    }

    jwt.authorize(function (err, tokens) {
        if (err) {
            return console.log(err)
        }

        //get list of reviews using Google Play Publishing API
        google.androidpublisher('v2').reviews.list({
            auth: jwt,
            packageName: config.appId
        }, function (err, resp) {
            if (err) {
                return console.error("ERROR: [" + config.appId + "] Could not fetch Google Play reviews, " + err);
            }

            if (config.verbose) console.log("INFO: [" + config.appId + "] Received reviews from Google Play");

            if (!resp.reviews) {
                callback([]);
                return;
            }

            var reviews = resp.reviews.map(function (review) {

                var comment = review.comments[0].userComment;

                var out = {};
                out.id = review.reviewId;
                out.author = review.authorName;
                out.version = comment.appVersionName;
                out.versionCode = comment.appVersionCode;
                out.osVersion = comment.androidOsVersion;

                if (comment.deviceMetadata) {
                    out.device = comment.deviceMetadata.productName;
                }

                out.text = comment.text;
                out.rating = comment.starRating;
                out.link = 'https://play.google.com/store/apps/details?id=' + config.appId + '&reviewId=' + review.reviewId;
                out.storeName = "Google Play";

                return out;
            });

            callback(reviews);
        })

    });
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
        footer += " for v" + review.version + ' (' + review.versionCode + ') ';
    }

    if (review.osVersion) {
        footer += ' Android ' + getVersionNameForCode(review.osVersion)
    }

    if (review.device) {
        footer += ', ' + review.device
    }

    if (review.link) {
        footer += " - " + "<" + review.link + "|" + appInformation.appName + ", " + review.storeName + ">";
    } else {
        footer += " - " + appInformation.appName + ", " + review.storeName;
    }

    var title = stars;
    if (review.title) {
        title = title + " – " + review.title;
    }

    return {
        "username": config.botUsername,
        "icon_url": config.botIcon,
        "channel": config.channel,
        "attachments": [
            {
                "mrkdwn_in": ["text", "pretext", "title", "footer"],

                "color": color,
                "author_name": review.author,

                "thumb_url": appInformation.appIcon,

                "title": title,

                "text": text,
                "footer": footer
            }
        ]
    };
};

var getVersionNameForCode = function (versionCode) {
    if (versionCode == 14) {
        return "4.0"
    }

    if (versionCode == 15) {
        return "4.0.3"
    }

    if (versionCode == 16) {
        return "4.1"
    }

    if (versionCode == 17) {
        return "4.2"
    }

    if (versionCode == 18) {
        return "4.3"
    }

    if (versionCode == 19) {
        return "4.4"
    }

    if (versionCode == 20) {
        return "4.4W"
    }

    if (versionCode == 21) {
        return "5.0"
    }

    if (versionCode == 22) {
        return "5.1"
    }

    if (versionCode == 22) {
        return "5.1"
    }

    if (versionCode == 23) {
        return "6.0"
    }

    if (versionCode == 24) {
        return "7.0"
    }

    if (versionCode == 25) {
        return "7.1"
    }

    if (versionCode == 26) {
        return "8.0"
    }
};