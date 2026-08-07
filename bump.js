const url = 'https://nssuihqftjpojeakupfj.supabase.co/rest/v1/users?id=eq.s001';
const key = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';

fetch(url, { headers: { apikey: key, Authorization: 'Bearer ' + key } })
  .then(r => r.json())
  .then(d => {
    const curr = d[0]?.streak || 0;
    console.log("Current streak:", curr);
    return fetch(url, {
      method: 'PATCH',
      headers: {
        apikey: key,
        Authorization: 'Bearer ' + key,
        'Content-Type': 'application/json',
        Prefer: 'return=representation'
      },
      body: JSON.stringify({ streak: curr + 1, lastActive: new Date().toISOString() })
    });
  })
  .then(r => r.json())
  .then(d => console.log("Updated to:", d[0]?.streak))
  .catch(console.error);
