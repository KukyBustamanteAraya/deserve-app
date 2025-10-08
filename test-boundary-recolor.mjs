/**
 * Test script for boundary-mask recolor API
 * Usage: node test-boundary-recolor.mjs
 */

const baseUrl = 'https://tirhnanxmjsasvhfphbq.supabase.co/storage/v1/object/public/products/17/0.jpg';
const maskUrl = 'https://tirhnanxmjsasvhfphbq.supabase.co/storage/v1/object/public/designs/masks/soccer%20uniform%20mask.png';

const testRequest = {
  designRequestId: 'test-' + Date.now(),
  baseUrl: baseUrl,
  silhouetteMaskUrl: maskUrl, // Not used but kept for API compatibility
  colors: {
    primary: '#FF0000',    // Red
    secondary: '#0000FF',  // Blue
    tertiary: '#FFFF00',   // Yellow
  },
  n: 1, // Generate 1 variant (simplified approach)
};

console.log('Testing boundary-recolor API...');
console.log('Request:', JSON.stringify(testRequest, null, 2));

fetch('http://localhost:3000/api/recolor-boundary', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(testRequest),
})
  .then(async (response) => {
    const data = await response.json();

    if (!response.ok) {
      console.error('\n❌ Error:', response.status);
      console.error(JSON.stringify(data, null, 2));
      process.exit(1);
    }

    console.log('\n✅ Success!');
    console.log('Output URL:', data.outputUrl);
    console.log('Duration:', data.duration, 'ms');
    console.log('\nRender spec:', JSON.stringify(data.renderSpec, null, 2));
  })
  .catch((error) => {
    console.error('\n❌ Request failed:', error.message);
    process.exit(1);
  });
