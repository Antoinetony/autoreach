const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Get customer's loyalty card
router.get('/card', async (req, res) => {
  const { business_id, token } = req.query;

  try {
    // Get loyalty settings for this business
    const { data: settings } = await supabase
      .from('loyalty_settings')
      .select('*')
      .eq('business_id', business_id)
      .single();

    const stampsRequired = settings?.stamps_required || 10;
    const rewardDescription = settings?.reward_description || 'Free service on your next visit!';

    // Get or create customer card
    let { data: card } = await supabase
      .from('loyalty_cards')
      .select('*')
      .eq('business_id', business_id)
      .eq('customer_token', token)
      .single();

    if (!card) {
      const { data: newCard } = await supabase
        .from('loyalty_cards')
        .insert([{ business_id, customer_token: token, stamp_count: 0 }])
        .select()
        .single();
      card = newCard;
    }

    res.json({
      stamp_count: card?.stamp_count || 0,
      reward_claimed: card?.reward_claimed || false,
      stamps_required: stampsRequired,
      reward_description: rewardDescription
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Collect a stamp
router.post('/stamp', async (req, res) => {
  const { business_id, customer_token } = req.body;

  try {
    // Get loyalty settings
    const { data: settings } = await supabase
      .from('loyalty_settings')
      .select('*')
      .eq('business_id', business_id)
      .single();

    const stampsRequired = settings?.stamps_required || 10;
    const rewardDescription = settings?.reward_description || 'Free service on your next visit!';

    // Get customer card
    let { data: card } = await supabase
      .from('loyalty_cards')
      .select('*')
      .eq('business_id', business_id)
      .eq('customer_token', customer_token)
      .single();

    if (!card) {
      const { data: newCard } = await supabase
        .from('loyalty_cards')
        .insert([{ business_id, customer_token, stamp_count: 0 }])
        .select()
        .single();
      card = newCard;
    }

    // Add stamp
    const newCount = (card.stamp_count || 0) + 1;
    const rewardUnlocked = newCount >= stampsRequired;

    await supabase
      .from('loyalty_cards')
      .update({
        stamp_count: rewardUnlocked ? 0 : newCount,
        reward_claimed: false,
        updated_at: new Date()
      })
      .eq('id', card.id);

    res.json({
      success: true,
      stamp_count: rewardUnlocked ? stampsRequired : newCount,
      reward_unlocked: rewardUnlocked,
      reward_description: rewardDescription
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Get loyalty stats for dashboard
router.get('/stats/:business_id', async (req, res) => {
  const { business_id } = req.params;

  try {
    const { data: cards } = await supabase
      .from('loyalty_cards')
      .select('*')
      .eq('business_id', business_id);

    const { data: settings } = await supabase
      .from('loyalty_settings')
      .select('*')
      .eq('business_id', business_id)
      .single();

    res.json({
      total_customers: cards?.length || 0,
      total_stamps: cards?.reduce((sum, c) => sum + c.stamp_count, 0) || 0,
      rewards_unlocked: cards?.filter(c => c.reward_claimed).length || 0,
      settings: settings || { stamps_required: 10, reward_description: 'Free service!' }
    });

  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Save loyalty settings
router.post('/settings', async (req, res) => {
  const { business_id, stamps_required, reward_description } = req.body;

  try {
    const { data: existing } = await supabase
      .from('loyalty_settings')
      .select('*')
      .eq('business_id', business_id)
      .single();

    if (existing) {
      await supabase
        .from('loyalty_settings')
        .update({ stamps_required, reward_description })
        .eq('business_id', business_id);
    } else {
      await supabase
        .from('loyalty_settings')
        .insert([{ business_id, stamps_required, reward_description }]);
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

module.exports = router;
