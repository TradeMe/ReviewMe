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

function translateText(text, to, callback) {
  detectLanguage(text, (error, from) => {
    if (error) {
      callback(error);
      return;
    }
    
    axios.post('https://libretranslate.com/translate', {
      q: text,
      source: from,
      target: to,
    })
    .then(response => {
      callback(null, response.data.translatedText);
    })
    .catch(error => {
      console.error('Error translating text:', error);
      callback(error);
    });
  });
}

