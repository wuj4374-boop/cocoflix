import { MediaType } from '../../media/entities/media.entity';

export interface SearchHitGenre {
  id: string;
  name: string;
  slug: string;
}

export interface SearchHitCast {
  name: string;
  character: string | null;
}

export interface SearchHitItem {
  id: string;
  title: string;
  originalTitle: string | null;
  type: MediaType;
  overview: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  rating: number;
  releaseDate: string | null;
  quality: string | null;
  genres: SearchHitGenre[];
  cast: SearchHitCast[];
  isHDR: boolean;
  hasChineseSubtitle: boolean;
  sourceCodec: string | null;
  score: number;
  highlight: Record<string, string[]>;
}

export interface SearchResult {
  items: SearchHitItem[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  searchAfter: string | null;
  took: number;
}

export interface SuggestItem {
  text: string;
  type: MediaType | null;
  posterUrl: string | null;
  id: string | null;
}

export interface SuggestResult {
  suggestions: SuggestItem[];
  took: number;
}
