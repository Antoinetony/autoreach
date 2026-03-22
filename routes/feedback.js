const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Save private feedback from unhappy customers
router.post('/submit', async (req, res) => {
  const { business_id, rating, message, customer_name, customer_email } = req.body;

  try {
    await supabase.from('feedback').insert([{
      business_id,
      rating,
      message,
      customer_name,
      customer_email,
      created_at: new Date()
    }]);

    // Notify business owner
    const { data: business } = await supabase
      .from('businesses')
      .select('owner_email, name')
      .eq('id', business_id)
      .single();

    res.json({ success: true, message: 'Feedback received' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Get all feedback for a business
router.get('/:business_id', async (req, res) => {
  const { business_id } = req.params;

  try {
    const { data } = await supabase
      .from('feedback')
      .select('*')
      .eq('business_id', business_id)
      .order('created_at', { ascending: false });

    res.json({ feedback: data });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;