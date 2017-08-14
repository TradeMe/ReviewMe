const request = require('request');
const appstore = require('./appstorereviews.js');
const googlePlay = require('./googleplayreviews.js');

const REVIEWS_STORES = {
    "APP_STORE": "app-store",
    "GOOGLE_PLAY": "google-play"
};

var published_reviews = [];

(function () {
    exports.start = function start(config) {
        if (!config.store) {
            // Determine from which store reviews are downloaded
            config.store = (config.appId.indexOf("\.") > -1) ? REVIEWS_STORES.GOOGLE_PLAY : REVIEWS_STORES.APP_STORE;
        }

        if (config.store === REVIEWS_STORES.APP_STORE) {
            appstore.startReview(config);
        } else {
            googlePlay.startReview(config)
        }
    }
}).call(this);


// Published reviews
exports.markReviewAsPublished = function (config, review) {
    if (!review || !review.id || this.reviewPublished(review)) return;

    if (published_reviews.count >= REVIEWS_LIMIT) {
        published_reviews.pop(published_reviews.count - (REVIEWS_LIMIT + 1));
    }
    published_reviews.unshift(review.id);
};

exports.reviewPublished = function (review) {
    if (!review || !review.id) return false;
    return published_reviews.indexOf(review.id) >= 0;
};

exports.publishedReviews = function () {
    return published_reviews;
};

exports.resetPublishedReviews = function () {
    return published_reviews = [];
};

exports.welcomeMessage = function (config, appInformation) {
    var storeName = appStoreName(config);
    var appName = config.appName ? config.appName : (appInformation.appName ? appInformation.appName : config.appId);
    return {
        "username": config.botUsername,
        "icon_url": config.botIcon,
        "channel": config.channel,
        "attachments": [
            {
                "mrkdwn_in": ["pretext", "author_name"],
                "fallback": "This channel will now receive " + storeName + " reviews for " + appName,
                "pretext": "This channel will now receive " + storeName + " reviews for ",
                "author_name": appName,
                "author_icon": config.appIcon ? config.appIcon : appInformation.appIcon
            }
        ]
    }
};

exports.postToSlack = function (message, config) {
    var messageJSON = JSON.stringify(message);
    if (config.verbose) {
        console.log("INFO: Posting new message to Slack: ");
        console.log("INFO: Hook: " + config.slackHook);
        console.log("INFO: Message: " + messageJSON);
    }
    return request.post({
        url: config.slackHook,
        headers: {
            "Content-Type": "application/json"
        },
        body: messageJSON
    });
};


var appStoreName = function (config) {
    return config.store === REVIEWS_STORES.APP_STORE ? "App Store" : "Google Play";
};
