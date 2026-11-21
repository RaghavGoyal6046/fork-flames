const MenuItem = require('../models/MenuItem');
const aiService = require('../services/aiService');

// @desc    Get AI mood-based food recommendations
// @route   POST /api/ai/recommend
// @access  Public
exports.getMoodRecommendations = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Please provide your mood or craving message.'
      });
    }

    // Fetch active menu items from MongoDB to ground the AI
    const menuItems = await MenuItem.find();

    if (!menuItems || menuItems.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No menu items available currently.'
      });
    }

    const aiResult = await aiService.getRecommendations(message, menuItems);

    res.status(200).json({
      success: true,
      data: aiResult
    });
  } catch (error) {
    console.error('AI Recommendation Controller Error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate recommendations. Please try again.'
    });
  }
};
