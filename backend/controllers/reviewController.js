const Review = require('../models/Review');

// Simple sentiment analysis helper (rule-based)
const analyzeSentiment = (text) => {
  const positiveWords = ['good', 'great', 'excellent', 'amazing', 'best', 'delicious', 'love', 'perfect'];
  const negativeWords = ['bad', 'terrible', 'awful', 'cold', 'late', 'worst', 'hate', 'gross', 'missing'];
  
  const words = text.toLowerCase().split(/\W+/);
  
  let score = 0;
  words.forEach(word => {
    if (positiveWords.includes(word)) score++;
    if (negativeWords.includes(word)) score--;
  });

  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
};

// @desc    Get all reviews
// @route   GET /api/reviews
// @access  Public
exports.getReviews = async (req, res) => {
  try {
    const reviews = await Review.find().populate('user', 'name');
    res.status(200).json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};

// @desc    Add review
// @route   POST /api/reviews
// @access  Private
exports.addReview = async (req, res) => {
  try {
    req.body.user = req.user.id;
    
    // Perform sentiment analysis
    req.body.sentiment = analyzeSentiment(req.body.comment);

    const review = await Review.create(req.body);
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
};
