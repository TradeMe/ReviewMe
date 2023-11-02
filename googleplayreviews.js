const controller = require('./reviews');
const {translateText} = require('./translate');

var {google} = require('googleapis');

var playScraper = require('google-play-scraper');
var androidVersions = require('android-versions')

exports.startReview = function (config, first_run) {
    var appInformation = {};

    //scrape Google Play for app information first
    playScraper.app({appId: config.appId})
        .then(function (appData, error) {
            if (error) {
                return console.error("ERROR: [" + config.appId + "] Could not scrape Google Play, " + error);
            }

            appInformation.appName = appData.title;
            appInformation.appIcon = appData.icon;

            exports.fetchGooglePlayReviews(config, appInformation, function (reviews) {
                // If we don't have any published reviews, then treat this as a baseline fetch, we won't post any
                // reviews to slack, but new ones from now will be posted
                if (first_run) {
                    var reviewLength = reviews.length;

                    for (var i = 0; i < reviewLength; i++) {
                        var initialReview = reviews[i];
                        controller.markReviewAsPublished(config, initialReview);
                    }

                    if (config.dryRun && reviews.length > 0) {
                        // Force publish a review if we're doing a dry run
                        publishReview(appInformation, config, reviews[reviews.length - 1], config.dryRun);
                    }
                }
                else {
                    exports.handleFetchedGooglePlayReviews(config, appInformation, reviews);
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
    if (!controller.reviewPublished(config, review) || force) {
        if (config.verbose) console.log("INFO: Received new review: " + JSON.stringify(review));
        var message = slackMessage(review, config, appInformation);
        controller.postToSlack(message, config);
        controller.markReviewAsPublished(config, review);
    } else {
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
    if (typeof config.publisherKey === 'object') {
        publisherJson = config.publisherKey;
    } else {
        try {
            publisherJson = JSON.parse(require('fs').readFileSync(config.publisherKey, 'utf8'));
        } catch (e) {
            console.warn(e)
        }
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
        google.androidpublisher('v3').reviews.list({
            auth: jwt,
            packageName: config.appId
        }, function (err, resp) {
            if (err) {
                return console.error("ERROR: [" + config.appId + "] Could not fetch Google Play reviews, " + err);
            }

            if (config.verbose) console.log("INFO: [" + config.appId + "] Received reviews from Google Play");

            if (!resp.data.reviews) {
                callback([]);
                return;
            }

            var reviews = resp.data.reviews.map(function (review) {

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

var slackMessage = function (review, translation, config, appInformation) {
    if (config.verbose) console.log("INFO: Creating message for review " + review.title);

    var stars = "";
    for (var i = 0; i < 5; i++) {
        stars += i < review.rating ? "★" : "☆";
    }

    var color = review.rating >= 4 ? "good" : (review.rating >= 2 ? "warning" : "danger");

    var text = "original: " + review.text + "\n";
    text += "translated:" + translateText(text, 'en') + "\n";

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
        "channel": config.channel,
        "attachments": [
            {
                "mrkdwn_in": ["text", "pretext", "title", "footer"],

                "color": color,
                "author_name": review.author,

                "thumb_url": config.showAppIcon ? appInformation.appIcon : config.botIcon,

                "title": title,

                "text": text,
                "footer": footer
            }
        ]
    };
};

var getVersionNameForCode = function (versionCode) {
    var version = androidVersions.get(versionCode);
    if (version != null) {
        return version.semver;
    }

    return "";
};
