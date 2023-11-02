const request = require('request');
const appstore = require('./appstorereviews.js');
const googlePlay = require('./googleplayreviews.js');
const fs = require('fs');

const REVIEWS_LIMIT = 1000;

const REVIEWS_STORES = {
    "APP_STORE": "app-store",
    "GOOGLE_PLAY": "google-play"
};

var published_reviews;
try {
    // @ts-ignore
    published_reviews = JSON.parse(fs.readFileSync('./published_reviews.json'));
} catch (err) {
    published_reviews = {}
}

(function () {
    exports.start = function start(config) {
        if (!config.store) {
            // Determine from which store reviews are downloaded
            config.store = (config.appId.indexOf("\.") > -1) ? REVIEWS_STORES.GOOGLE_PLAY : REVIEWS_STORES.APP_STORE;
        }

        if (config.store === REVIEWS_STORES.APP_STORE) {
            appstore.startReview(config, !published_reviews[config.appId]);
        } else {
            googlePlay.startReview(config, !published_reviews[config.appId])
        }
    }
}).call(this);


// Published reviews
exports.markReviewAsPublished = function (config, review) {
    if (!review || !review.id || this.reviewPublished(config, review)) return;

    if (!published_reviews[config.appId]) {
        published_reviews[config.appId] = []
    }

    if (config.verbose) {
        console.log("INFO: Checking if we need to prune published reviews have (" + published_reviews[config.appId].length + ") limit (" + REVIEWS_LIMIT + ")");
    }
    if (published_reviews[config.appId].length >= REVIEWS_LIMIT) {
        published_reviews[config.appId] = published_reviews[config.appId].slice(0, REVIEWS_LIMIT);
    }

    published_reviews[config.appId].unshift(review.id);

    if (config.verbose) {
        console.log("INFO: Review marked as published: " + JSON.stringify(published_reviews[config.appId]));
    }

    fs.writeFileSync('./published_reviews.json', JSON.stringify(published_reviews), { flag: 'w' })
};

exports.reviewPublished = function (config, review) {
    if (!review || !review.id || !published_reviews[config.appId]) return false;
    return published_reviews[config.appId].indexOf(review.id) >= 0;
};

exports.publishedReviews = function () {
    return published_reviews;
};

exports.resetPublishedReviews = function () {
    return published_reviews = {};
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
