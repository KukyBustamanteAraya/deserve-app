#!/bin/bash

# Apply migration 068 directly to the database

echo "Applying migration 068_allow_authenticated_collection_submissions.sql..."

cat ./supabase/migrations/068_allow_authenticated_collection_submissions.sql | npx supabase db remote exec --db-url "$DATABASE_URL"

echo "Migration applied successfully!"
