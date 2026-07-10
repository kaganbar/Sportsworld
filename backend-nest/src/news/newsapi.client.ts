import axios from 'axios';

// Confirmed working directly: GET https://newsapi.org/v2/top-headlines with
// category=sports returns real, current sports headlines (BBC, Al Jazeera,
// Fox Sports, ...) with no keyword-guessing needed, unlike /v2/everything's
// free-text query. NewsAPI recommends the X-Api-Key header over the
// apiKey query param specifically so the key doesn't end up in server logs.
const BASE_URL = 'https://newsapi.org/v2/top-headlines';

export interface RawArticle {
  source: { id: string | null; name: string };
  author: string | null;
  title: string;
  description: string | null;
  url: string;
  publishedAt: string;
}

interface TopHeadlinesResponse {
  status: string;
  totalResults: number;
  articles: RawArticle[];
}

export async function fetchSportsHeadlines(apiKey: string): Promise<RawArticle[]> {
  const response = await axios.get<TopHeadlinesResponse>(BASE_URL, {
    params: { category: 'sports', language: 'en', pageSize: 50 },
    headers: { 'X-Api-Key': apiKey },
    timeout: 15000,
  });
  return response.data.articles;
}
