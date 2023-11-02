const controller = require('./reviews');
const {translateText} = require('./translate');

const fs = require('fs');
var request = require('request');

const DEFAULT_INTERVAL_SECONDS = 300

exports.startReview = function (config, first_run) {

    if (config.regions === false){
        try {
            config.regions = JSON.parse(fs.readFileSync(__dirname  + '/regions.json', 'utf8'));
        } catch (err) {
            config.regions = ["us"];
        }
    }
    if (!config.regions) {
        config.regions = ["us"];
    }

    if (!config.interval) {
        config.interval = DEFAULT_INTERVAL_SECONDS
    }

    for (var i = 0; i < config.regions.length; i++) {
        const region = config.regions[i];

        // Find the app information to get a icon URL
        exports.fetchAppInformation(config, region, function (globalAppInformation) {
            const appInformation = Object.assign({}, globalAppInformation);
            exports.fetchAppStoreReviews(config, appInformation, function (reviews) {
                // If we don't have any published reviews, then treat this as a baseline fetch, we won't post any
                // reviews to slack, but new ones from now will be posted

                if (first_run) {
                    var reviewLength = reviews.length;

                    for (var j = 0; j < reviewLength; j++) {
                        var initialReview = reviews[j];
                        controller.markReviewAsPublished(config, initialReview);
                    }

                    if (config.dryRun && reviews.length > 0) {
                        // Force publish a review if we're doing a dry run
                        publishReview(appInformation, config, reviews[reviews.length - 1], config.dryRun);
                    }
                }
                else {
                    exports.handleFetchedAppStoreReviews(config, appInformation, reviews);
                }

                //calculate the interval with an offset, to avoid spamming the server
                var interval_seconds = config.interval + (i * 10);

                setInterval(function (config, appInformation) {
                    if (config.verbose) console.log("INFO: [" + config.appId + "] Fetching App Store reviews");

                    exports.fetchAppStoreReviews(config, appInformation, function (reviews) {
                        exports.handleFetchedAppStoreReviews(config, appInformation, reviews);
                    });
                }, interval_seconds * 1000, config, appInformation);
            });
        });
    }
};

var fetchAppStoreReviewsByPage = function(config, appInformation, page, callback){
    const url = "https://itunes.apple.com/" + appInformation.region + "/rss/customerreviews/page="+page+"/id=" + config.appId + "/sortBy=mostRecent/json";

    request(url, function (error, response, body) {
        if (error) {
            if (config.verbose) {
                if (config.verbose) console.log("ERROR: Error fetching reviews from App Store for (" + config.appId + ") (" + appInformation.region + ")");
                console.log(error)
            }
            callback([]);
            return;
        }

        var rss;
        try {
            rss = JSON.parse(body);
        } catch(e) {
            console.error("Error parsing app store reviews");
            console.error(e);

            callback([]);
            return;
        }

        var entries = rss.feed.entry;

        if (entries == null || entries.length <= 0) {
            if (config.verbose) console.log("INFO: Received no reviews from App Store for (" + config.appId + ") (" + appInformation.region + ")");
            callback([]);
            return;
        }
        if(!Array.isArray(entries)) {
            entries = [entries]
        }
        
        if (config.verbose) console.log("INFO: Received reviews from App Store for (" + config.appId + ") (" + appInformation.region + ")");


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

exports.fetchAppStoreReviews = function (config, appInformation, callback) {
    var page = 1;
    var allReviews = [];
    function pageCallback(reviews){
        allReviews = allReviews.concat(reviews);
        if (reviews.length > 0 && page < 10){
            page++;
            fetchAppStoreReviewsByPage(config, appInformation, page, pageCallback);
        } else {
            callback(allReviews);
        }
    }
    fetchAppStoreReviewsByPage(config, appInformation, page, pageCallback);
};


exports.handleFetchedAppStoreReviews = function (config, appInformation, reviews) {
    if (config.verbose) console.log("INFO: [" + config.appId + "(" + appInformation.region + ")] Handling fetched reviews");
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
    review.link = reviewLink(rssItem) || appInformation.appLink;
    review.storeName = "App Store";
    return review;
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

var reviewRating = function (review) {
    return review['im:rating'] && !isNaN(review['im:rating'].label) ? parseInt(review['im:rating'].label) : -1;
};

var reviewAuthor = function (review) {
    return review.author ? review.author.name.label : '';
};

var reviewLink = function (review) {
    return review.author ? review.author.uri.label : '';
};

var reviewAppVersion = function (review) {
    return review['im:version'] ? review['im:version'].label : '';
};

// App Store app information
exports.fetchAppInformation = function (config, region, callback) {
    const url = "https://itunes.apple.com/lookup?id=" + config.appId + "&country=" + region;
    const appInformation = {
        appName: config.appName,
        appIcon: config.appIcon,
        appLink: config.appLink,
        region: region
    };
    request(url, function (error, response, body) {
        if (error) {
            if (config.verbose) {
                if (config.verbose) console.log("ERROR: Error fetching app data from App Store for (" + config.appId + ")");
                console.log(error)
            }
            callback(appInformation);
            return;
        }

        var data;
        try {
            data = JSON.parse(body);
        } catch(e) {
            console.error("Error parsing app store data");
            console.error(e);

            callback(appInformation);
            return;
        }

        var entries = data.results;

        if (entries == null || entries.length <= 0) {
            if (config.verbose) console.log("INFO: Received no data from App Store for (" + config.appId + ")");
            callback(appInformation);
            return;
        }

        if (config.verbose) console.log("INFO: Received data from App Store for (" + config.appId + ")");
        var entry = entries[0];
        if (!config.appName && entry.trackCensoredName) {
            appInformation.appName = entry.trackCensoredName;
        }

        if (!config.appIcon && entry.artworkUrl100 ) {
            appInformation.appIcon = entry.artworkUrl100;
        }

        if (!config.appLink && entry.trackViewUrl) {
            appInformation.appLink = entry.trackViewUrl;
        }

        callback(appInformation)
    });
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

    var text = "original: " + review.text + "\n";
    
    if (review.translatedText != null) {
        text += "translated:" + review.translatedText + "\n";
    }

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
        "channel": config.channel,
        "attachments": [
            {
                "mrkdwn_in": ["text", "pretext", "title"],
                "color": color,
                "author_name": review.author,
                "thumb_url": config.showAppIcon ? (review.appIcon ? review.appIcon : appInformation.appIcon) : config.botIcon,
                "title": title,
                "text": text,
                "footer": footer
            }
        ]
    };
};
