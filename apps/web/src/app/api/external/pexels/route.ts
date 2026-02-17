import { NextResponse } from 'next/server';

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PEXELS_BASE_URL = 'https://api.pexels.com/v1';
const PEXELS_VIDEO_URL = 'https://api.pexels.com/videos';

export async function GET(request: Request) {
  if (!PEXELS_API_KEY) {
    return NextResponse.json({ error: 'Pexels API key not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');
  const type = searchParams.get('type') || 'video'; // 'video' or 'image'
  const page = searchParams.get('page') || '1';
  const perPage = searchParams.get('per_page') || '15';

  if (!query) {
    return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
  }

  try {
    const baseUrl = type === 'video' ? PEXELS_VIDEO_URL : PEXELS_BASE_URL;
    const endpoint = type === 'video' ? '/search' : '/search';
    
    const response = await fetch(`${baseUrl}${endpoint}?query=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&safe_search=true`, {
      headers: {
        'Authorization': PEXELS_API_KEY
      }
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json({ error: error.message || 'Pexels API error' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Pexels API Proxy error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
