import { requireAdmin } from '@/lib/auth/admin-guard';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { DeleteButton } from './DeleteButton';

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  price_cents: number;
  status: string;
  hero_path: string | null;
  sport_id: string;
  sports?: { name: string };
}

export default async function AdminProductsPage() {
  await requireAdmin();

  const supabase = createSupabaseServerClient();

  // Fetch all products with sport names
  const { data: products, error } = await supabase
    .from('products')
    .select(`
      id,
      name,
      slug,
      category,
      price_cents,
      status,
      hero_path,
      sport_id,
      sports (name)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
          Failed to load products: {error.message}
        </div>
      </div>
    );
  }

  const typedProducts = (products || []) as unknown as Product[];

  // Get public URL helper
  const getPublicUrl = (path: string | null) => {
    if (!path) return null;
    return supabase.storage.from('products').getPublicUrl(path).data.publicUrl;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Products</h1>
          <p className="text-gray-600 mt-1">Manage your product catalog</p>
        </div>
        <Link
          href="/admin/products/new"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + New Product
        </Link>
      </div>

      {/* Products count */}
      <div className="mb-4 text-sm text-gray-600">
        {typedProducts.length} product{typedProducts.length !== 1 ? 's' : ''} total
      </div>

      {/* Products table */}
      {typedProducts.length === 0 ? (
        <div className="bg-white border rounded-lg p-12 text-center">
          <p className="text-gray-600 mb-4">No products yet</p>
          <Link
            href="/admin/products/new"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Create your first product
          </Link>
        </div>
      ) : (
        <div className="bg-white border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Image</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Sport</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Category</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Price</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {typedProducts.map((product) => {
                const heroUrl = getPublicUrl(product.hero_path);
                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    {/* Image */}
                    <td className="px-4 py-3">
                      {heroUrl ? (
                        <img
                          src={heroUrl}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-200 rounded flex items-center justify-center text-gray-400 text-xs">
                          No image
                        </div>
                      )}
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-sm text-gray-500">/{product.slug}</div>
                    </td>

                    {/* Sport */}
                    <td className="px-4 py-3 text-sm">
                      {product.sports?.name || 'Unknown'}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 text-sm capitalize">{product.category}</td>

                    {/* Price */}
                    <td className="px-4 py-3 text-sm">
                      ${(product.price_cents / 100).toLocaleString()}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 text-xs rounded ${
                          product.status === 'active'
                            ? 'bg-green-100 text-green-800'
                            : product.status === 'draft'
                            ? 'bg-gray-100 text-gray-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {product.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/products/${product.id}/edit`}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </Link>
                      <DeleteButton
                        productId={product.id}
                        productName={product.name}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}