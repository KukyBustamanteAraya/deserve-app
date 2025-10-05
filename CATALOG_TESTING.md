# Catalog Integration Testing Guide

## Phase 2, Step 3 - Product Catalog Integration Testing

### Prerequisites
1. Database migration applied (see DATABASE_SETUP.md)
2. Development server running (`npm run dev`)
3. User authenticated (logged in)

### Manual Testing Checklist

#### 1. API Endpoints Testing

**Sports Endpoint (`/api/catalog/sports`)**
```bash
# Should return 401 without authentication
curl http://localhost:3000/api/catalog/sports

# Should return sports list when authenticated (replace with actual session cookie)
curl -H "Cookie: [your-session-cookie]" http://localhost:3000/api/catalog/sports
```

**Products Endpoint (`/api/catalog/products`)**
```bash
# All products
curl -H "Cookie: [session]" http://localhost:3000/api/catalog/products

# Filter by sport
curl -H "Cookie: [session]" http://localhost:3000/api/catalog/products?sport=soccer

# With pagination
curl -H "Cookie: [session]" "http://localhost:3000/api/catalog/products?limit=5"
```

**Product Detail Endpoint (`/api/catalog/products/[slug]`)**
```bash
# Get specific product
curl -H "Cookie: [session]" http://localhost:3000/api/catalog/products/legacy-home-jersey-soccer
```

#### 2. UI Testing Flow

**Step 1: Navigate to Catalog**
1. Visit `http://localhost:3000` and log in
2. Click "Catálogo" in the navigation header
3. ✅ Should load `/catalog` page with sports filter and product grid

**Step 2: Sports Filter**
1. ✅ Sports tabs should be populated from database (Soccer, Basketball, etc.)
2. ✅ Click on "Soccer" tab
3. ✅ URL should update to `/catalog?sport=soccer`
4. ✅ Product grid should filter to show only soccer products
5. ✅ Loading state should show during filter change

**Step 3: Product Grid**
1. ✅ Products should display with images, names, and prices
2. ✅ Prices should be formatted correctly (e.g., $350)
3. ✅ Placeholder images should show for missing/broken images
4. ✅ Responsive grid (2 cols mobile → 4 cols desktop)

**Step 4: Product Detail**
1. ✅ Click on any product card
2. ✅ Should navigate to `/catalog/[slug]` (e.g., `/catalog/legacy-home-jersey-soccer`)
3. ✅ Product detail page should show:
   - Large product image(s)
   - Product name and description
   - Formatted price
   - Sport category link
   - Related products section
4. ✅ Image gallery should work if multiple images exist

**Step 5: Navigation**
1. ✅ Breadcrumb navigation should work
2. ✅ "Catálogo" link in header should be highlighted when on catalog pages
3. ✅ Back to catalog links should maintain sport filter

#### 3. Error States Testing

**Authentication Required**
1. ✅ Visit `/catalog` while logged out
2. ✅ Should redirect to `/login?redirect=/catalog`

**Invalid Product Slug**
1. ✅ Visit `/catalog/non-existent-product`
2. ✅ Should show 404 page

**Network Errors**
1. ✅ Block network requests and try filtering sports
2. ✅ Should show error state with retry button

#### 4. Performance Testing

**Loading Times**
- ✅ Initial catalog page load: < 3 seconds
- ✅ Sport filter change: < 1 second
- ✅ Product detail page: < 2 seconds

**Image Optimization**
- ✅ Product images should use Next.js Image component
- ✅ Images should load with proper sizes and alt text
- ✅ Image loading should be prioritized for above-the-fold content

#### 5. Accessibility Testing

**Keyboard Navigation**
- ✅ Tab through sports filter
- ✅ Tab through product grid
- ✅ Enter key should activate buttons/links

**Screen Reader**
- ✅ Sports filter should have proper ARIA labels
- ✅ Product cards should have meaningful alt text
- ✅ Loading states should be announced

**Focus Management**
- ✅ Focus should be visible on all interactive elements
- ✅ Focus should return to appropriate element after modal/navigation

### Expected Results Summary

✅ **API Endpoints**: All return proper JSON with authentication checks
✅ **Sports Filter**: Dynamic loading from database, URL updates, filtering works
✅ **Product Grid**: Responsive, loading states, error handling
✅ **Product Details**: Full product information, image gallery, related products
✅ **Navigation**: Breadcrumbs, header links, proper routing
✅ **Error Handling**: 401 redirects, 404 pages, network error recovery
✅ **Performance**: Fast loading, optimized images, smooth interactions
✅ **Accessibility**: Keyboard navigation, screen reader support, ARIA labels

### Troubleshooting

**Database Connection Issues**
- Check `.env.local` has correct Supabase credentials
- Verify migration was applied successfully
- Check Supabase Dashboard for RLS policies

**TypeScript Errors**
- Run `npm run typecheck` to identify issues
- Ensure all types are properly imported
- Check for missing dependencies

**API Authentication Errors**
- Verify user is logged in with valid session
- Check browser Network tab for API calls
- Ensure RLS policies allow read access for authenticated users

**Image Loading Issues**
- Check browser Console for image load errors
- Verify picsum.photos URLs are accessible
- Test with different image URLs if needed

### Development Notes

The catalog integration includes:
- 3 dedicated API endpoints with proper error handling
- Server-side rendering for initial page load
- Client-side interactivity for filtering and pagination
- Comprehensive TypeScript types
- Responsive UI components
- Accessibility features
- Performance optimizations

This provides a solid foundation for the complete e-commerce catalog functionality.