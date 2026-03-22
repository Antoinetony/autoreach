const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Sign up new business owner
router.post('/signup', async (req, res) => {
  const { email, password, business_name, google_review_url, phone } = req.body;

  try {
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    });

    if (authError) throw authError;

    // Create business record
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .insert([{
        owner_id: authData.user.id,
        owner_email: email,
        name: business_name,
        google_review_url,
        phone,
        plan: 'free',
        review_count: 0,
        created_at: new Date()
      }])
      .select()
      .single();

    if (bizError) throw bizError;

    res.json({ success: true, business_id: business.id });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Sign in
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    // Get business info
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', data.user.id)
      .single();

    res.json({ success: true, business, token: data.session.access_token });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Sign out
router.post('/logout', async (req, res) => {
  await supabase.auth.signOut();
  res.json({ success: true });
});

module.exports = router;