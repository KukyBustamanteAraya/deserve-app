'use client';
import React, { useState } from 'react';
import { supabaseClient } from '../lib/supabaseClient';

export default function SupabaseSetup() {
  const [status, setStatus] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const createTable = async () => {
    setStatus('Creating products table...');

    try {
      const { error } = await supabaseClient.rpc('exec_sql', {
        sql: `
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

          CREATE INDEX IF NOT EXISTS idx_products_sport ON products(sport);
          CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at);

          ALTER TABLE products ENABLE ROW LEVEL SECURITY;

          DROP POLICY IF EXISTS "Public read access for products" ON products;
          CREATE POLICY "Public read access for products"
            ON products FOR SELECT
            USING (true);
        `
      });

      if (error) {
        setStatus('Table creation failed - please create manually in Supabase dashboard');
        console.error(error);
      } else {
        setStatus('✓ Products table created successfully');
      }
    } catch (err) {
      setStatus('Error: ' + err.message);
    }
  };

  const createBucket = async () => {
    setStatus('Creating storage bucket...');

    try {
      const { error } = await supabaseClient.storage.createBucket('product-images', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
        fileSizeLimit: 5242880, // 5MB
      });

      if (error && !error.message.includes('already exists')) {
        setStatus('Bucket creation failed: ' + error.message);
      } else {
        setStatus('✓ Storage bucket ready');
      }
    } catch (err) {
      setStatus('Error: ' + err.message);
    }
  };

  const migrateProducts = async () => {
    if (isUploading) return;

    setIsUploading(true);
    setStatus('Starting product migration...');

    const soccerJerseys = [
      '2.png', 'A.png', 'AS.png', 'ASD.png', 'ASDF.png', 'ASDFG.png', 'ASDFGH.png',
      'B.png', 'Bl.png', 'Blu.png', 'Blue S.png', 'Blue So.png', 'Blue Soc.png',
      'Blue Soccer Jersey.png', 'Blue.png'
    ];

    const basketballJerseys = [
      'beautyblu.png', 'blaccc.png', 'black mamba.png', 'breakthrough.png',
      'brownnn.png', 'cool purplll.png', 'dunnos.png', 'dye.png'
    ];

    try {
      let uploadedCount = 0;

      // Process soccer jerseys
      for (const filename of soccerJerseys) {
        try {
          // Fetch image from public folder
          const response = await fetch(`/Products/Soccer/Jerseys/${filename}`);
          if (!response.ok) continue;

          const blob = await response.blob();
          const file = new File([blob], filename, { type: 'image/png' });

          // Upload to Supabase Storage
          const storageFileName = `futbol/${filename}`;
          const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('product-images')
            .upload(storageFileName, file, {
              cacheControl: '31536000',
              upsert: true
            });

          if (uploadError) {
            console.error(`Upload error for ${filename}:`, uploadError);
            continue;
          }

          // Get public URL
          const { data: urlData } = supabaseClient.storage
            .from('product-images')
            .getPublicUrl(storageFileName);

          // Insert product into database
          const product = {
            name: `Camiseta de Fútbol ${filename.replace('.png', '').replace(/\s+/g, ' ')}`,
            price: `$${(42 + Math.floor(Math.random() * 15)).toLocaleString()}.000`,
            sport: 'fútbol',
            category: 'jersey',
            image_url: urlData.publicUrl,
            image_filename: filename
          };

          const { error: insertError } = await supabaseClient
            .from('products')
            .insert([product]);

          if (!insertError) {
            uploadedCount++;
            setStatus(`✓ Uploaded ${uploadedCount} products...`);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          console.error(`Error processing ${filename}:`, err);
        }
      }

      // Process basketball jerseys
      for (const filename of basketballJerseys) {
        try {
          const response = await fetch(`/Products/Basketball/${filename}`);
          if (!response.ok) continue;

          const blob = await response.blob();
          const file = new File([blob], filename, { type: 'image/png' });

          const storageFileName = `basquetbol/${filename}`;
          const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from('product-images')
            .upload(storageFileName, file, {
              cacheControl: '31536000',
              upsert: true
            });

          if (uploadError) {
            console.error(`Upload error for ${filename}:`, uploadError);
            continue;
          }

          const { data: urlData } = supabaseClient.storage
            .from('product-images')
            .getPublicUrl(storageFileName);

          const product = {
            name: `Jersey de Básquetbol ${filename.replace('.png', '').replace(/\s+/g, ' ')}`,
            price: `$${(45 + Math.floor(Math.random() * 20)).toLocaleString()}.000`,
            sport: 'básquetbol',
            category: 'jersey',
            image_url: urlData.publicUrl,
            image_filename: filename
          };

          const { error: insertError } = await supabaseClient
            .from('products')
            .insert([product]);

          if (!insertError) {
            uploadedCount++;
            setStatus(`✓ Uploaded ${uploadedCount} products...`);
          }

          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (err) {
          console.error(`Error processing ${filename}:`, err);
        }
      }

      setStatus(`🎉 Migration complete! Uploaded ${uploadedCount} products to Supabase`);
    } catch (err) {
      setStatus('Migration failed: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
        <h1 className="text-2xl font-bold mb-6">Supabase Setup & Migration</h1>

        <div className="space-y-4">
          <button
            onClick={createTable}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded hover:bg-blue-600"
          >
            1. Create Products Table
          </button>

          <button
            onClick={createBucket}
            className="w-full bg-green-500 text-white py-2 px-4 rounded hover:bg-green-600"
          >
            2. Create Storage Bucket
          </button>

          <button
            onClick={migrateProducts}
            disabled={isUploading}
            className="w-full bg-purple-500 text-white py-2 px-4 rounded hover:bg-purple-600 disabled:opacity-50"
          >
            {isUploading ? 'Migrating...' : '3. Migrate Products to Supabase'}
          </button>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold mb-2">Status:</h3>
          <p className="whitespace-pre-wrap">{status}</p>
        </div>
      </div>
    </div>
  );
}