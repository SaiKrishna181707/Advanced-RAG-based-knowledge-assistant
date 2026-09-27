/** Shared fixtures for the frontend tests. */

export const USER = {
  id: 'u1',
  name: 'Ada Navigator',
  email: 'ada@example.com',
  subscription_plan: 'free',
  subscription_status: 'active',
}

export const DOCUMENT = {
  id: 'doc1',
  name: 'evaluation-memo.txt',
  file_size: 4096,
  mime_type: 'text/plain',
  extension: 'txt',
  page_count: 1,
  location_unit: 'page',
  chunk_count: 4,
  char_count: 900,
  collection_id: null,
  status: 'ready',
  stage: 'ready',
  extraction_status: 'ok',
  indexing_status: 'ok',
  processing_time_ms: 120,
  error_message: null,
  sha256: 'a'.repeat(64),
  created_at: '2026-09-01T10:00:00+00:00',
  updated_at: '2026-09-01T10:00:01+00:00',
}

export const CHUNK = {
  id: 'chunk1',
  document_id: 'doc1',
  document_name: 'evaluation-memo.txt',
  content: 'After filtering, 12,480 admissions records remained.',
  page_number: 1,
  location_unit: 'page',
  chunk_index: 0,
}

export const PLAN_CATALOGUE = {
  plans: [
    {
      key: 'free',
      name: 'Free',
      tagline: 'Start navigating.',
      price_monthly: 0,
      price_label: 'Free',
      highlights: ['25 documents', '200 questions a month'],
      cta: 'Get started',
      highlighted: false,
      document_limit: 25,
      storage_limit_bytes: 104857600,
      monthly_questions: 200,
      max_file_size_mb: 25,
      retrieval_top_k: 4,
      history_turns: 3,
    },
    {
      key: 'pro',
      name: 'Pro',
      tagline: 'For heavy research.',
      price_monthly: 19,
      price_label: '$19',
      highlights: ['1,000 documents', '10,000 questions a month'],
      cta: 'Upgrade to Pro',
      highlighted: true,
      document_limit: 1000,
      storage_limit_bytes: 10737418240,
      monthly_questions: 10000,
      max_file_size_mb: 100,
      retrieval_top_k: 8,
      history_turns: 6,
    },
    {
      key: 'team',
      name: 'Team',
      tagline: 'Shared knowledge spaces.',
      price_monthly: 49,
      price_label: '$49',
      highlights: ['Shared knowledge spaces', 'Workspace analytics'],
      cta: 'Talk to us',
      highlighted: false,
      document_limit: 10000,
      storage_limit_bytes: 107374182400,
      monthly_questions: 100000,
      max_file_size_mb: 200,
      retrieval_top_k: 10,
      history_turns: 8,
    },
  ],
  billing: {
    provider: null,
    mode: 'manual',
    note: 'Plans are product-level entitlements. No payment provider is connected yet, so changing plan does not bill you.',
  },
}

/** Build a fetch-style Response object for the API envelope. */
export function envelope(data, { status = 200, error = null } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => ({
      success: status >= 200 && status < 300,
      data,
      error,
    }),
  }
}
