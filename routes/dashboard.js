const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Get dashboard stats for a business
router.get('/stats/:business_id', async (req, res) => {
  const { business_id } = req.params;

  try {
    // Get all reviews
    const { data: reviews } = await supabase
      .from('reviews')
      .select('*')
      .eq('business_id', business_id);

    // Get all feedback
    const { data: feedback } = await supabase
      .from('feedback')
      .select('*')
      .eq('business_id', business_id);

    // Calculate stats
    const totalScans = reviews.length;
    const positiveReviews = reviews.filter(r => r.rating >= 4).length;
    const negativeReviews = reviews.filter(r => r.rating < 4).length;
    const avgRating = reviews.length > 0
      ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
      : 0;

    // Get reviews per day for chart (last 30 days)
    const last30 = reviews.filter(r => {
      const date = new Date(r.created_at);
      const diff = (new Date() - date) / (1000 * 60 * 60 * 24);
      return diff <= 30;
    });

    // Check milestones
    const milestones = [];
    if (positiveReviews >= 5) milestones.push({ label: '5 Reviews', achieved: true });
    if (positiveReviews >= 10) milestones.push({ label: '10 Reviews', achieved: true });
    if (positiveReviews >= 25) milestones.push({ label: '25 Reviews', achieved: true });
    if (positiveReviews >= 50) milestones.push({ label: '50 Reviews', achieved: true });
    if (positiveReviews >= 100) milestones.push({ label: '100 Reviews! 🎉', achieved: true });

    res.json({
      totalScans,
      positiveReviews,
      negativeReviews,
      avgRating,
      milestones,
      recentFeedback: feedback.slice(0, 5)
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Get business info
router.get('/business/:business_id', async (req, res) => {
  const { business_id } = req.params;

  try {
    const { data } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', business_id)
      .single();

    res.json({ business: data });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;