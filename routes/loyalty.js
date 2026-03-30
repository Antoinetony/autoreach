const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Get customer card by phone number
router.get('/card', async (req, res) => {
  const { business_id, phone } = req.query;

  try {
    const { data: settings } = await supabase
      .from('loyalty_settings')
      .select('*')
      .eq('business_id', business_id)
      .single();

    const stampsRequired = settings?.stamps_required || 10;
    const rewardDescription = settings?.reward_description || 'Free service on your next visit!';

    if (!phone) {
      return res.json({ needs_phone: true, stamps_required: stampsRequired, reward_description: rewardDescription });
    }

    let { data: card } = await supabase
      .from('loyalty_cards')
      .select('*')
      .eq('business_id', business_id)
      .eq('customer_phone', phone)
      .single();

    res.json({
      found: !!card,
      stamp_count: card?.stamp_count || 0,
      customer_name: card?.customer_name || '',
      reward_claimed: card?.reward_claimed || false,
      stamps_required: stampsRequired,
      reward_description: rewardDescription,
      last_visit: card?.last_visit || null
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Search customers by name
router.get('/search', async (req, res) => {
  const { business_id, name } = req.query;
  try {
    const { data } = await supabase
      .from('loyalty_cards')
      .select('*')
      .eq('business_id', business_id)
      .ilike('customer_name', `%${name}%`)
      .limit(5);
    res.json({ customers: data || [] });
  } catch (err) {
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Collect a stamp
router.post('/stamp', async (req, res) => {
  const { business_id, phone, customer_name } = req.body;

  try {
    const { data: settings } = await supabase
      .from('loyalty_settings')
      .select('*')
      .eq('business_id', business_id)
      .single();

    const stampsRequired = settings?.stamps_required || 10;
    const rewardDescription = settings?.reward_description || 'Free service on your next visit!';

    let { data: card } = await supabase
      .from('loyalty_cards')
      .select('*')
      .eq('business_id', business_id)
      .eq('customer_phone', phone)
      .single();

    if (!card) {
      const { data: newCard } = await supabase
        .from('loyalty_cards')
        .insert([{
          business_id,
          customer_phone: phone,
          customer_name: customer_name || 'Customer',
          stamp_count: 0,
          last_visit: new Date()
        }])
        .select()
        .single();
      card = newCard;
    }

    const newCount = (card.stamp_count || 0) + 1;
    const rewardUnlocked = newCount >= stampsRequired;

    await supabase
      .from('loyalty_cards')
      .update({
        stamp_count: rewardUnlocked ? 0 : newCount,
        customer_name: customer_name || card.customer_name,
        last_visit: new Date(),
        updated_at: new Date()
      })
      .eq('id', card.id);

    res.json({
      success: true,
      stamp_count: rewardUnlocked ? stampsRequired : newCount,
      reward_unlocked: rewardUnlocked,
      reward_description: rewardDescription,
      customer_name: customer_name || card.customer_name
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong' });
  }
});

// Get all customers for dashboard
router.get('/customers/:business_id', async (req, res) => {
  const { business_id } = req.params;
  try {
    const { data } = await supabase
      .from('loyalty_cards')
      .select('*')
      .eq('business_id', business_id)
      .order('last_visit', { ascending: false });

    res.json({ customers: data || [] });
  } catch (err) {
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
      total_stamps: cards?.reduce((sum, c) => sum + (c.stamp_count || 0), 0) || 0,
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