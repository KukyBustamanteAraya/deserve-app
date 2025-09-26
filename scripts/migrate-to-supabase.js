const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Product data
const productData = {
  'fútbol': {
    path: 'Products/Soccer/Jerseys',
    files: [
      '2.png', 'A.png', 'AS.png', 'ASD.png', 'ASDF.png', 'ASDFG.png', 'ASDFGH.png',
      'B.png', 'Bl.png', 'Blu.png', 'Blue S.png', 'Blue So.png', 'Blue Soc.png',
      'Blue Socc.png', 'Blue Socce.png', 'Blue Soccer J.png', 'Blue Soccer Je.png',
      'Blue Soccer Jer.png', 'Blue Soccer Jers.png', 'Blue Soccer Jerse.png',
      'Blue Soccer Jersey F.png', 'Blue Soccer Jersey Fl.png', 'Blue Soccer Jersey Fla.png',
      'Blue Soccer Jersey Flat Lay.png', 'Blue Soccer Jersey Flat.png', 'Blue Soccer Jersey.png',
      'Blue Soccer.png', 'Blue.png', 'MYSTIQUE.png', 'NEWSFLASHHOES.png', 'Q.png',
      'QW.png', 'QWE.png', 'QWER.png', 'QWERTY.png', 'QWERTYU.png', 'Z.png',
      'bluesocc.png', 'qqq.png', 'qqq1.png', 'qqq12.png', 'qqq123.png', 'qqq1234.png',
      'qqq12345.png', 'qqq123456.png', 'qqq1234561.png', 'qqq12345612.png', 'qqq123456123.png',
      'qqq1234561234.png', 'qqq12345612345.png', 'qqq123456123456.png', 'za.png', 'zaq.png',
      'zaqw.png', 'zaqws.png', 'zaqwsd.png', 'zaqwsde.png', 'zaqwsdfer.png', 'zaqwsx.png',
      'zasdxcfvg.png', 'zasertedcf.png', 'zasqwsx.png', 'zasxdc.png', 'zasxderft.png',
      'zasxdfgh.png', 'zx.png', 'zxc.png', 'zxcv.png', 'zxcvb.png', 'zxcvbn.png',
      'zxcvbnm.png', 'zxcvc.png', 'zxcx.png', 'zxcxz.png', 'zxz.png'
    ]
  },
  'básquetbol': {
    path: 'Products/Basketball',
    files: [
      'beautyblu.png', 'blaccc.png', 'black mamba.png', 'breakthrough.png',
      'brownnn.png', 'cool purplll.png', 'dunnos.png', 'dye.png',
      'elevate 2.png', 'elevate 3.png', 'elevate 5.png', 'jaggered.png',
      'laker sky.png', 'lines.png', 'miamiii.png', 'miayay.png',
      'mounts.png', 'nest.png', 'phildo.png', 'reddd.png',
      'usa.png', 'wave rangee.png', 'wuha.png', 'yelblu.png'
    ]
  }
};

async function setupDatabase() {
  console.log('Setting up database table and storage bucket...');

  // Execute the SQL to create table and bucket
  const { error: dbError } = await supabase.rpc('exec_sql', {
    sql: `
      -- Create products table
      CREATE TABLE IF NOT EXISTS products (
        id BIGSERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price TEXT NOT NULL,
        sport TEXT NOT NULL,
        category TEXT DEFAULT 'jersey',
        image_url TEXT NOT NULL,
        image_filename TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Create indexes
      CREATE INDEX IF NOT EXISTS idx_products_sport ON products(sport);
      CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

      -- Enable RLS
      ALTER TABLE products ENABLE ROW LEVEL SECURITY;

      -- Create policies
      DROP POLICY IF EXISTS "Public read access for products" ON products;
      CREATE POLICY "Public read access for products"
        ON products FOR SELECT
        USING (true);
    `
  });

  if (dbError) {
    console.log('Note: Some database setup may require manual execution in Supabase dashboard');
  }

  // Create storage bucket
  const { error: bucketError } = await supabase.storage.createBucket('product-images', {
    public: true,
    allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    fileSizeLimit: 5242880, // 5MB
  });

  if (bucketError && !bucketError.message.includes('already exists')) {
    console.error('Error creating bucket:', bucketError);
  } else {
    console.log('✓ Storage bucket ready');
  }
}

async function uploadImageToSupabase(filePath, sport, filename) {
  try {
    // Read file
    const fileBuffer = fs.readFileSync(filePath);
    const file = new File([fileBuffer], filename, { type: 'image/png' });

    // Upload to Supabase Storage
    const storageFileName = `${sport}/${filename}`;
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(storageFileName, file, {
        cacheControl: '31536000',
        upsert: true
      });

    if (error) {
      console.error(`Error uploading ${filename}:`, error);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('product-images')
      .getPublicUrl(storageFileName);

    return urlData.publicUrl;
  } catch (err) {
    console.error(`Error processing ${filename}:`, err);
    return null;
  }
}

async function insertProductToDatabase(product) {
  const { data, error } = await supabase
    .from('products')
    .insert([product])
    .select();

  if (error) {
    console.error('Error inserting product:', error);
    return null;
  }

  return data[0];
}

async function migrateProducts() {
  console.log('Starting product migration to Supabase...');

  const publicDir = path.join(__dirname, '..', 'public');
  let totalUploaded = 0;
  let totalErrors = 0;

  for (const [sport, sportData] of Object.entries(productData)) {
    console.log(`\nProcessing ${sport} products...`);

    for (const filename of sportData.files) {
      const filePath = path.join(publicDir, sportData.path, filename);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filename}`);
        totalErrors++;
        continue;
      }

      // Upload to Supabase Storage
      const imageUrl = await uploadImageToSupabase(filePath, sport, filename);

      if (!imageUrl) {
        totalErrors++;
        continue;
      }

      // Create product entry
      const product = {
        name: `${sport === 'fútbol' ? 'Camiseta de Fútbol' : 'Jersey de Básquetbol'} ${filename.replace('.png', '').replace(/\s+/g, ' ')}`,
        price: `$${(42 + Math.floor(Math.random() * 15)).toLocaleString()}.000`,
        sport: sport,
        category: 'jersey',
        image_url: imageUrl,
        image_filename: filename
      };

      // Insert into database
      const result = await insertProductToDatabase(product);

      if (result) {
        console.log(`✓ Uploaded: ${filename}`);
        totalUploaded++;
      } else {
        console.log(`✗ Failed to save: ${filename}`);
        totalErrors++;
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  console.log(`\n🎉 Migration complete!`);
  console.log(`✓ Successfully uploaded: ${totalUploaded} products`);
  console.log(`✗ Errors: ${totalErrors} products`);
}

async function main() {
  try {
    await setupDatabase();
    await migrateProducts();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
main();