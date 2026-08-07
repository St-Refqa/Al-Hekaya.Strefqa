import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nssuihqftjpojeakupfj.supabase.co';
const supabaseKey = 'sb_publishable_un9YUbLKIr-QypqU45QyBQ_crgIgAgS';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const storeDir = path.join(process.cwd(), 'Store');
  
  if (!fs.existsSync(storeDir)) {
    console.error(`Store directory not found: ${storeDir}`);
    process.exit(1);
  }

  const files = fs.readdirSync(storeDir).filter(f => f.endsWith('.jpeg') || f.endsWith('.jpg') || f.endsWith('.png'));
  
  // Get file stats to sort by "value" (using size as a proxy)
  const fileStats = files.map(file => {
    const filePath = path.join(storeDir, file);
    const stats = fs.statSync(filePath);
    return {
      file,
      filePath,
      size: stats.size
    };
  });

  // Sort by size ascending (lowest to highest)
  fileStats.sort((a, b) => a.size - b.size);

  let currentPrice = 500;
  
  console.log(`Found ${files.length} images to upload.`);

  for (let i = 0; i < fileStats.length; i++) {
    const { file, filePath } = fileStats[i];
    
    try {
      // Read file and convert to base64
      const fileBuffer = fs.readFileSync(filePath);
      const ext = path.extname(file).toLowerCase();
      const mimeType = ext === '.png' ? 'image/png' : 'image/jpeg';
      const base64Data = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

      // Create item object
      const title = file.replace(/\.[^/.]+$/, ""); // Remove extension
      const itemId = 'store_' + Math.random().toString(36).substring(2, 15);
      
      const item = {
        id: itemId,
        title: `هدية ${i + 1}`, // Generic title, or use filename
        description: `هدية مميزة من المتجر`,
        price: currentPrice,
        images: [base64Data],
        category: 'gift',
        stock: 10,
        createdAt: new Date().toISOString()
      };

      console.log(`Inserting item ${i + 1}/${fileStats.length}: ${item.title} at ${currentPrice} points...`);
      
      const { data, error } = await supabase.from('storeItems').insert(item);
      
      if (error) {
        console.error(`Error inserting ${file}:`, error.message);
      } else {
        console.log(`Successfully inserted ${file}`);
      }
      
      // Increment price by 100 or something similar? The prompt just said "make the lowest one 500 points for example". 
      // We can just increment by 50 or 100.
      currentPrice += 100;
      
    } catch (err) {
      console.error(`Failed to process ${file}:`, err);
    }
  }

  console.log("Done uploading store items.");
}

run();
