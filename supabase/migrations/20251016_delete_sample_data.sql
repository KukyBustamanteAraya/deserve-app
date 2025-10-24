-- Delete sample/fake sizing data
-- Run this to clear out the test data

DELETE FROM size_charts;

-- Optionally, reset the auto-generated UUIDs
-- (This isn't necessary but keeps things clean)

COMMENT ON TABLE size_charts IS 'Size chart data cleared - ready for real data import';
