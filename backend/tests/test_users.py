"""Auth leve, cadastro e histórico de assistidos."""


def register(client, name="Ana", email="ana@test.pt"):
    return client.post("/users", json={"name": name, "email": email})


def test_create_user(client):
    r = register(client)
    assert r.status_code == 201
    body = r.json()
    assert body["id"] == 1
    assert body["email"] == "ana@test.pt"


def test_create_duplicate_email_conflict(client):
    register(client)
    r = register(client)
    assert r.status_code == 409


def test_login_existing_user(client):
    register(client, email="joao@test.pt")
    r = client.post("/users/login", json={"email": "joao@test.pt"})
    assert r.status_code == 200
    assert r.json()["email"] == "joao@test.pt"


def test_login_unknown_user_404(client):
    r = client.post("/users/login", json={"email": "ghost@test.pt"})
    assert r.status_code == 404


def test_get_user_not_found(client):
    r = client.get("/users/999")
    assert r.status_code == 404


def test_watched_flow(client):
    uid = register(client).json()["id"]

    # marca dois filmes
    assert client.post(f"/users/{uid}/watched", json={"movie_id": 603}).status_code == 201
    assert client.post(f"/users/{uid}/watched", json={"movie_id": 11}).status_code == 201

    # idempotente: remarcar não cria de novo
    again = client.post(f"/users/{uid}/watched", json={"movie_id": 603})
    assert again.status_code == 201
    assert again.json()["created"] is False

    # lista (mais recente primeiro → 11 antes de 603)
    listed = client.get(f"/users/{uid}/watched").json()["items"]
    assert [m["id"] for m in listed] == [11, 603]

    # remove um
    assert client.delete(f"/users/{uid}/watched/603").status_code == 204
    remaining = client.get(f"/users/{uid}/watched").json()["items"]
    assert [m["id"] for m in remaining] == [11]


def test_mark_watched_unknown_user_404(client):
    r = client.post("/users/999/watched", json={"movie_id": 603})
    assert r.status_code == 404


def test_mark_watched_unknown_movie_404(client):
    uid = register(client).json()["id"]
    r = client.post(f"/users/{uid}/watched", json={"movie_id": 999999})
    assert r.status_code == 404


def test_list_watched_unknown_user_404(client):
    assert client.get("/users/999/watched").status_code == 404
