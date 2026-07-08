"""Catálogo: listagem, busca, detalhe e similares."""


def test_list_movies_orders_by_popularity(client):
    r = client.get("/movies?limit=3")
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 5
    assert body["limit"] == 3
    titles = [m["title"] for m in body["items"]]
    # Pulp Fiction (95) e The Matrix (90) são os mais populares do seed
    assert titles[0] == "Pulp Fiction"
    assert titles[1] == "The Matrix"


def test_search_by_title(client):
    r = client.get("/movies?q=matrix")
    assert r.status_code == 200
    items = r.json()["items"]
    assert len(items) == 1
    assert items[0]["id"] == 603


def test_search_is_case_insensitive(client):
    r = client.get("/movies?q=STAR")
    assert [m["id"] for m in r.json()["items"]] == [11]


def test_movie_detail(client):
    r = client.get("/movies/603")
    assert r.status_code == 200
    body = r.json()
    assert body["title"] == "The Matrix"
    assert body["director"] == "Lana Wachowski"
    assert "Science Fiction" in body["genres"]


def test_movie_detail_not_found(client):
    r = client.get("/movies/999999")
    assert r.status_code == 404


def test_similar_movies(ctx):
    ctx.vectors.pairs = [(78, 0.91), (11, 0.88)]
    r = ctx.client.get("/movies/603/similar?limit=5")
    assert r.status_code == 200
    body = r.json()
    assert body["movie_id"] == 603
    assert [m["id"] for m in body["items"]] == [78, 11]
    assert body["items"][0]["score"] == 0.91


def test_similar_unavailable_index_returns_503(ctx):
    ctx.vectors.ready = False
    r = ctx.client.get("/movies/603/similar")
    assert r.status_code == 503


def test_similar_unknown_movie_404(client):
    r = client.get("/movies/424242/similar")
    assert r.status_code == 404
