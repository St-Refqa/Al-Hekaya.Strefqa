const key = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';

const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Cairo' });
const id = `s001_${date}`;
const url = `https://nssuihqftjpojeakupfj.supabase.co/rest/v1/daily_challenges?id=eq.${id}`;

fetch(url, {
  method: 'DELETE',
  headers: {
    apikey: key,
    Authorization: 'Bearer ' + key,
  }
})
.then(r => console.log('Deleted status:', r.status))
.catch(console.error);
