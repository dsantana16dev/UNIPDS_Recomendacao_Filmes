"""Recomendações: delega ao ml-service, hidrata do catálogo, trata erros."""


def make_user_with_history(ctx):
    uid = ctx.client.post("/users", json={"name": "Rec", "email": "rec@test.pt"}).json()["id"]
    ctx.client.post(f"/users/{uid}/watched", json={"movie_id": 603})
    ctx.client.post(f"/users/{uid}/watched", json={"movie_id": 78})
    return uid


def test_recommendations_hydrated_and_ordered(ctx):
    uid = make_user_with_history(ctx)
    # o ml-service devolve ids + score; o backend hidrata do catálogo preservando ordem
    ctx.ml.items = [
        {"id": 1891, "score": 0.98},
        {"id": 680, "score": 0.90},
    ]
    r = ctx.client.get(f"/users/{uid}/recommendations?limit=5")
    assert r.status_code == 200
    body = r.json()
    assert body["user_id"] == uid
    assert [m["id"] for m in body["items"]] == [1891, 680]
    assert body["items"][0]["title"] == "The Empire Strikes Back"
    assert body["items"][0]["score"] == 0.98


def test_recommendations_exclude_watched(ctx):
    uid = make_user_with_history(ctx)
    # mesmo que o ml devolva um filme já visto, o fake respeita seen_movie_ids
    ctx.ml.items = [{"id": 603, "score": 0.99}, {"id": 1891, "score": 0.95}]
    r = ctx.client.get(f"/users/{uid}/recommendations")
    ids = [m["id"] for m in r.json()["items"]]
    assert 603 not in ids
    assert 1891 in ids


def test_recommendations_model_not_trained_503(ctx):
    uid = make_user_with_history(ctx)
    ctx.ml.raise_not_trained = True
    r = ctx.client.get(f"/users/{uid}/recommendations")
    assert r.status_code == 503


def test_recommendations_unknown_user_404(ctx):
    r = ctx.client.get("/users/999/recommendations")
    assert r.status_code == 404


def test_recommendations_drop_unknown_catalog_ids(ctx):
    uid = make_user_with_history(ctx)
    # id inexistente no catálogo é descartado na hidratação
    ctx.ml.items = [{"id": 424242, "score": 0.99}, {"id": 680, "score": 0.80}]
    r = ctx.client.get(f"/users/{uid}/recommendations")
    assert [m["id"] for m in r.json()["items"]] == [680]
