const axios = require('axios');

function detectLanguage(text, callback) {
  axios.post('https://libretranslate.com/detect', {
    q: text,
  })
  .then(response => {
    callback(null, response.data[0].language);
  })
  .catch(error => {
    console.error('Error detecting language:', error);
    callback(error);
  });
}

exports.translateReview = function(review, config, appInformation, callback) {
  detectLanguage(text, (error, from) => {
    if (error) {
      callback(review, "failed to translate", config, appInformation);
      return;
    }
    
    axios.post('https://libretranslate.com/translate', {
      q: text,
      source: from,
      target: to,
    })
    .then(response => {
      callback(null, response.data.translatedText);
      callback(review, response.data.translatedText, config, appInformation);
    })
    .catch(error => {
      console.error('Error translating text:', error);
      callback(review, "failed to translate", config, appInformation);
    });
  });
}
