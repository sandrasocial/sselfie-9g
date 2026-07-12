-- One authenticated post-success SUITE review per customer.
-- The route also checks for an existing row before inserting; this index closes the concurrency gap.
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_testimonials_suite_review_user
  ON admin_testimonials ((key_benefits->>'source_user_id'))
  WHERE platform = 'in_app'
    AND product_mentioned = 'SSELFIE SUITE'
    AND testimonial_type = 'review'
    AND key_benefits->>'source_user_id' IS NOT NULL;
