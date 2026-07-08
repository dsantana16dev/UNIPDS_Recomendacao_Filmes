import type {
  MovieDetail,
  MovieList,
  RecommendationList,
  SimilarList,
  User,
  WatchedList,
} from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/** Erro de API com o status HTTP e o `detail` do FastAPI. */
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new ApiError(0, "Backend indisponível. Verifique se a API está no ar.");
  }

  if (res.status === 204) return undefined as T;

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail =
      (body && (body.detail as string)) || `Erro ${res.status}`;
    throw new ApiError(res.status, detail);
  }
  return body as T;
}

// --------------------------------------------------------------------------- //
// Filmes
// --------------------------------------------------------------------------- //
export function listMovies(params: {
  q?: string;
  limit?: number;
  offset?: number;
} = {}): Promise<MovieList> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.offset != null) qs.set("offset", String(params.offset));
  const suffix = qs.toString() ? `?${qs}` : "";
  return request<MovieList>(`/movies${suffix}`);
}

export function getMovie(id: number): Promise<MovieDetail> {
  return request<MovieDetail>(`/movies/${id}`);
}

export function getSimilar(id: number, limit = 12): Promise<SimilarList> {
  return request<SimilarList>(`/movies/${id}/similar?limit=${limit}`);
}

// --------------------------------------------------------------------------- //
// Usuários / auth leve
// --------------------------------------------------------------------------- //
export function createUser(payload: {
  name: string;
  email: string;
}): Promise<User> {
  return request<User>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function loginUser(email: string): Promise<User> {
  return request<User>("/users/login", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

// --------------------------------------------------------------------------- //
// Histórico (assistidos)
// --------------------------------------------------------------------------- //
export function listWatched(userId: number): Promise<WatchedList> {
  return request<WatchedList>(`/users/${userId}/watched`);
}

export function markWatched(
  userId: number,
  movieId: number,
): Promise<{ created: boolean }> {
  return request(`/users/${userId}/watched`, {
    method: "POST",
    body: JSON.stringify({ movie_id: movieId }),
  });
}

export function unmarkWatched(userId: number, movieId: number): Promise<void> {
  return request<void>(`/users/${userId}/watched/${movieId}`, {
    method: "DELETE",
  });
}

// --------------------------------------------------------------------------- //
// Recomendações
// --------------------------------------------------------------------------- //
export function getRecommendations(
  userId: number,
  limit = 12,
): Promise<RecommendationList> {
  return request<RecommendationList>(
    `/users/${userId}/recommendations?limit=${limit}`,
  );
}
