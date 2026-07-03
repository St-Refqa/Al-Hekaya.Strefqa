const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const toDelete = [
        { id: 'xm4bve1k7a7hkpz9a2mlb', uid: '3xoabzhn21l78elna51eel', score: 10 }, // I don't know the score, let me fetch it from logs or the DB? No, I deleted them already!
    ];
    // Wait, the records are deleted. I don't know the exact score they got.
}
run();
