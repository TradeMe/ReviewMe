const axios = require('axios');

exports.translateText = async function(text) {
    const encodedParams = new URLSearchParams();
    encodedParams.set('q', text);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept-Encoding': 'application/gzip',
        'X-RapidAPI-Key': '261c497befmshbc9f0ccb74eedd0p12977cjsnc632b31922f3',
        'X-RapidAPI-Host': 'google-translate1.p.rapidapi.com'
      },
      body: encodedParams,
    };
    
    try {
      const response = await fetch('https://google-translate1.p.rapidapi.com/language/translate/v2/detect', options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();      
      return data
    } catch (error) {
      console.error(error);
      return null
    }
}