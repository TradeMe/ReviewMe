# ReviewMe

![NPM Version](https://img.shields.io/npm/v/@trademe/reviewme.svg) ![Downloads](https://img.shields.io/npm/dt/@trademe/reviewme.svg)  

ReviewMe is a nodejs app that monitors App Store and Google Play reviews, and posts them to Slack.

![ReviewMe Preview](images/reviewme-preview.png)

This project was originally forked from [reviews-to-slack](https://www.npmjs.com/package/reviews-to-slack)


## Installation

`npm install -g @trademe/reviewme`

## Usage

`reviewme ~/myappsconfig.json`

## Config

ReviewMe requires a config file. A simple config looks something like:

```
{
  "slackHook": "https://hooks.slack.com/services/01234/5678",
  "verbose": true,
  "dryRun": false,
  "botUsername": "ReviewMe",
  "interval":300,
  "apps": [
    {
      "appId": "com.myandroidapp",
      "publisherKey": "~/publisher.json"
    },
    {
      "appId": "012345678",
      "regions": [
              "nz",
              "us",
      ]
    }
  ]
}
```
### Options
* **slackHook**: The slack hook for your Slack integration. Reviews will be posted here.
* **verbose**: When enabled, log messages will be printed to the console
* **dryRun**: When enabled, ReviewMe will post the latest app review for each app on startup. Useful for debugging
* **botUsername** The username of the Slack bot
* **botIcon** An image url to use for the bot avatar
* **botEmoji** A slack emoji to use for the bot avatar, e.g. `:apple:`
* **showAppIcon** Determines if app icon will be displayed
* **interval** The interval (in seconds) to check for new reviews. Default: `300`.
* **apps** A list of apps to fetch reviews for. See App Options below
* **publisherKey** *Android Only* The path to a Google Play Publisher private key (`.json` file). Used for accessing the Google Play Publisher API.

### App options

* **appId** The Android app package name, or the iOS app ID.
* **regions** *iOS Only* The [ISO 3166-2](https://en.wikipedia.org/wiki/ISO_3166-2#Current_codes) regions to fetch reviews for


## Google Play Publisher Key
ReviewMe requires access to the Google Play Publisher API to fetch reviews. You need to supply ReviewMe with a Google Play Publisher API private key:

* Go to the Google Play Developer Console -> Settings -> API Access
* Create a Google Play Android Developer project
* Create a Service Account
* Download the private key (`.json`)
* Supply the path to the private key in the `config.json`

 



