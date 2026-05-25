// ============ TMDB API 响应类型 ============

export interface TmdbSearchResult {
  page: number;
  results: TmdbSearchItem[];
  total_pages: number;
  total_results: number;
}

export interface TmdbSearchItem {
  id: number;
  media_type: 'movie' | 'tv';
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  vote_count: number;
  genre_ids: number[];
  popularity: number;
  original_language: string;
}

export interface TmdbMovieDetail {
  id: number;
  imdb_id: string | null;
  title: string;
  original_title: string;
  overview: string;
  tagline: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date: string;
  runtime: number;
  status: string;
  vote_average: number;
  vote_count: number;
  budget: number;
  revenue: number;
  genres: TmdbGenre[];
  production_companies: TmdbProductionCompany[];
  production_countries: TmdbProductionCountry[];
  spoken_languages: TmdbSpokenLanguage[];
  belongs_to_collection: TmdbCollection | null;
  homepage: string | null;
  popularity: number;
  adult: boolean;
  videos?: TmdbVideoResponse;
  credits?: TmdbCredits;
  images?: TmdbImages;
  similar?: TmdbSearchResult;
  keywords?: TmdbKeywords;
}

export interface TmdbTvDetail {
  id: number;
  name: string;
  original_name: string;
  overview: string;
  tagline: string;
  poster_path: string | null;
  backdrop_path: string | null;
  first_air_date: string;
  last_air_date: string;
  number_of_seasons: number;
  number_of_episodes: number;
  episode_run_time: number[];
  status: string;
  vote_average: number;
  vote_count: number;
  genres: TmdbGenre[];
  production_companies: TmdbProductionCompany[];
  production_countries: TmdbProductionCountry[];
  spoken_languages: TmdbSpokenLanguage[];
  networks: TmdbNetwork[];
  created_by: TmdbCreatedBy[];
  seasons: TmdbSeason[];
  homepage: string | null;
  popularity: number;
  in_production: boolean;
  type: string;
  videos?: TmdbVideoResponse;
  credits?: TmdbCredits;
  images?: TmdbImages;
  similar?: TmdbSearchResult;
  keywords?: TmdbKeywords;
}

export interface TmdbSeason {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string;
  episode_count: number;
}

export interface TmdbSeasonDetail {
  id: number;
  season_number: number;
  name: string;
  overview: string;
  poster_path: string | null;
  air_date: string;
  episodes: TmdbEpisode[];
}

export interface TmdbEpisode {
  id: number;
  episode_number: number;
  season_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  air_date: string;
  runtime: number | null;
  vote_average: number;
  vote_count: number;
  crew: TmdbCrewMember[];
  guest_stars: TmdbCastMember[];
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbGenreList {
  genres: TmdbGenre[];
}

export interface TmdbProductionCompany {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface TmdbProductionCountry {
  iso_3166_1: string;
  name: string;
}

export interface TmdbSpokenLanguage {
  iso_639_1: string;
  english_name: string;
  name: string;
}

export interface TmdbNetwork {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface TmdbCreatedBy {
  id: number;
  name: string;
  profile_path: string | null;
}

export interface TmdbCollection {
  id: number;
  name: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

// ============ Credits ============

export interface TmdbCredits {
  id: number;
  cast: TmdbCastMember[];
  crew: TmdbCrewMember[];
}

export interface TmdbCastMember {
  id: number;
  name: string;
  original_name: string;
  character: string;
  profile_path: string | null;
  order: number;
  gender: number;
  known_for_department: string;
  popularity: number;
}

export interface TmdbCrewMember {
  id: number;
  name: string;
  original_name: string;
  job: string;
  department: string;
  profile_path: string | null;
  gender: number;
  known_for_department: string;
  popularity: number;
}

// ============ Images ============

export interface TmdbImages {
  id: number;
  backdrops: TmdbImage[];
  posters: TmdbImage[];
  logos?: TmdbImage[];
}

export interface TmdbImage {
  aspect_ratio: number;
  file_path: string;
  height: number;
  width: number;
  iso_639_1: string | null;
  vote_average: number;
  vote_count: number;
}

// ============ Videos ============

export interface TmdbVideoResponse {
  id: number;
  results: TmdbVideo[];
}

export interface TmdbVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
  iso_639_1: string;
  iso_3166_1: string;
  official: boolean;
  published_at: string;
}

// ============ Keywords ============

export interface TmdbKeywords {
  id: number;
  keywords?: TmdbKeyword[];
  results?: TmdbKeyword[];
}

export interface TmdbKeyword {
  id: number;
  name: string;
}

// ============ Find by External ID ============

export interface TmdbFindResult {
  movie_results: TmdbSearchItem[];
  tv_results: TmdbSearchItem[];
  person_results: unknown[];
}

// ============ 内部类型 ============

export interface MetadataScrapeResult {
  mediaId: string;
  tmdbId: number;
  mediaType: 'movie' | 'tv';
  success: boolean;
  message: string;
  updatedAt: Date;
}

export interface ImageProxyOptions {
  path: string;
  size?: string;
}

export interface TmdbConfig {
  images: {
    base_url: string;
    secure_base_url: string;
    backdrop_sizes: string[];
    logo_sizes: string[];
    poster_sizes: string[];
    profile_sizes: string[];
    still_sizes: string[];
  };
  change_keys: string[];
}
