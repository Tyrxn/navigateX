require('dotenv').config();
var express = require('express');
var router = express.Router();

const { getObjectFromS3, uploadJsonToS3 } = require('../public/javascripts/s3Handler');

router.get('/', async function(req, res, next) {
  const s3Data = await getObjectFromS3();

  if (s3Data && typeof s3Data.pageCount === "number") {
    s3Data.pageCount += 1;
    await uploadJsonToS3(s3Data); 
    res.render('index', { title: 'Express', pageCount: s3Data.pageCount });
  } else {
    res.render('index', { title: 'Express', pageCount: 'Data not found'});
  }
});

// New route to serve config to the client
router.get('/config', function(req, res) {
  const config = {
    openWeatherAPIKey: process.env.OPEN_WEATHER_API_KEY,
    openChargeAPIKey: process.env.OPEN_CHARGE_API_KEY,
    googleAPIKey: process.env.GOOGLE_API_KEY

  };

  res.json(config);
});

module.exports = router;
