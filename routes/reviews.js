const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Handle star rating submission
router.post('/rate', async (req, res) => {
  const { business_id, rating } = req.body;

  try {
    // Save the rating to database
    await supabase.from('reviews').insert([{ business_id, rating }]);

    // Route based on rating
    if (rating >= 4) {
      // Get the business Google review link
      const { data } = await supabase
        .from('businesses')
        .select('google_review_url')
        .eq('id', business_id)
        .single();

      res.json({ redirect: data.google_review_url });
    } else {
      res.json({ redirect: `/feedback?business_id=${business_id}` });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;