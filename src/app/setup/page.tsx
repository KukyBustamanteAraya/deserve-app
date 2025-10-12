'use client';
import { useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

export default function SetupPage() {
  const [status, setStatus] = useState('Ready to migrate to Supabase');
  const [isUploading, setIsUploading] = useState(false);

  const createBucket = async () => {
    setStatus('Creating storage bucket...');

    try {
      const { error } = await supabaseBrowser.storage.createBucket('product-images', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
        fileSizeLimit: 5242880, // 5MB
      });

      if (error && !error.message.includes('already exists')) {
        setStatus('Bucket creation failed: ' + error.message);
      } else {
        setStatus('✅ Storage bucket ready');
      }
    } catch (err) {
      setStatus('Error: ' + (err as Error).message);
    }
  };

  const migrateProducts = async () => {
    if (isUploading) return;

    setIsUploading(true);
    setStatus('Starting product migration...');

    const soccerJerseys = [
      '2.png', 'A.png', 'AS.png', 'ASD.png', 'ASDF.png', 'Blue Soccer Jersey.png', 'Blue.png'
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
          const { error: uploadError } = await supabaseBrowser.storage
            .from('product-images')
            .upload(storageFileName, file, {
              cacheControl: '31536000',
              upsert: true
            });

          if (uploadError) {
            logger.error(`Upload error for ${filename}:`, uploadError);
            continue;
          }

          // Get public URL
          const { data: urlData } = supabaseBrowser.storage
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

          const { error: insertError } = await supabaseBrowser
            .from('products')
            .insert([product]);

          if (!insertError) {
            uploadedCount++;
            setStatus(`✅ Uploaded ${uploadedCount} products...`);
          }

          await new Promise(resolve => setTimeout(resolve, 200));
        } catch (err) {
          logger.error(`Error processing ${filename}:`, err);
        }
      }

      setStatus(`🎉 Migration complete! Uploaded ${uploadedCount} products to Supabase`);
    } catch (err) {
      setStatus('Migration failed: ' + (err as Error).message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ fontSize: '2rem', marginBottom: '2rem' }}>Supabase Migration</h1>

      <div style={{ marginBottom: '1rem' }}>
        <button
          onClick={createBucket}
          style={{
            padding: '1rem 2rem',
            marginRight: '1rem',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer'
          }}
        >
          1. Create Storage Bucket
        </button>

        <button
          onClick={migrateProducts}
          disabled={isUploading}
          style={{
            padding: '1rem 2rem',
            backgroundColor: isUploading ? '#9ca3af' : '#8b5cf6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: isUploading ? 'not-allowed' : 'pointer'
          }}
        >
          {isUploading ? 'Migrating...' : '2. Migrate Products'}
        </button>
      </div>

      <div style={{
        padding: '1rem',
        backgroundColor: '#f3f4f6',
        borderRadius: '8px',
        marginTop: '2rem'
      }}>
        <h3>Status:</h3>
        <p>{status}</p>
      </div>
    </div>
  );
}