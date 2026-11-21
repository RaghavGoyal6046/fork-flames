const express = require('express');
const { getMoodRecommendations } = require('../controllers/aiController');

const router = express.Router();

router.post('/recommend', getMoodRecommendations);

module.exports = router;
