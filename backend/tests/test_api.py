"""API tests: what the frontend (Pole 3) relies on."""
import pytest

from api.main import _cached_horizon
from conftest import CATALOGUE_IDS, START, contract_example, needs_ldem


# ---------- GET /sites ----------

def test_sites_returns_the_catalogue(client):
    r = client.get("/sites")
    assert r.status_code == 200
    assert [s["id"] for s in r.json()["sites"]] == CATALOGUE_IDS


# ---------- POST /analysis: results ----------

@needs_ldem
@pytest.mark.parametrize("site_id", CATALOGUE_IDS)
def test_analysis_matches_contract_example(client, site_id):
    """The API must give exactly the validated engine output stored in contract/examples/."""
    r = client.post("/analysis", json={"siteId": site_id, "start": START})
    assert r.status_code == 200
    assert r.json() == contract_example(f"result_{site_id}.json")


@needs_ldem
def test_custom_coordinates_give_the_same_result_as_the_catalogue_site(client):
    custom = client.post("/analysis", json={"latDeg": -86.0, "lonDeg": 0.1, "start": START}).json()
    ref = contract_example("result_malapert.json")
    assert custom["siteId"] == "custom"
    assert {k: v for k, v in custom.items() if k != "siteId"} == {k: v for k, v in ref.items() if k != "siteId"}


@needs_ldem
def test_one_year_analysis_is_allowed(client):
    r = client.post("/analysis", json={"siteId": "malapert", "start": START, "days": 366, "stepMinutes": 120})
    assert r.status_code == 200
    assert r.json()["windows"]["sun"][-1]["endUtc"] <= "2027-11-15T00:00:00Z"


@needs_ldem
def test_flat_horizon_option(client):
    r = client.post("/analysis", json={"siteId": "malapert", "start": START, "horizon": "flat"})
    assert r.status_code == 200
    assert r.json()["horizon"] == "flat"


@needs_ldem
def test_horizon_cache_is_reused_for_another_date(client):
    body = {"siteId": "malapert_summit", "stepMinutes": 60, "days": 5}
    client.post("/analysis", json={**body, "start": START})
    hits = _cached_horizon.cache_info().hits
    r = client.post("/analysis", json={**body, "start": "2027-01-10T00:00:00Z"})
    assert r.status_code == 200
    assert r.json()["times"][0] == "2027-01-10T00:00:00Z"
    assert _cached_horizon.cache_info().hits == hits + 1


# ---------- POST /analysis: terrain coverage ----------

@needs_ldem
@pytest.mark.parametrize("lat, lon", [(-70.0, 0.0), (45.0, 0.0)])
def test_point_outside_the_terrain_map_is_refused(client, lat, lon):
    for horizon in ("terrain", "flat"):
        r = client.post("/analysis", json={"latDeg": lat, "lonDeg": lon, "start": START, "horizon": horizon})
        assert r.status_code == 422
        assert "outside the terrain data" in r.json()["detail"]


@needs_ldem
def test_incomplete_terrain_refuses_terrain_horizon_but_allows_flat(client):
    body = {"latDeg": -84.0, "lonDeg": 0.0, "start": START, "days": 2}
    r = client.post("/analysis", json=body)
    assert r.status_code == 422
    assert "Terrain horizon not available" in r.json()["detail"]
    assert client.post("/analysis", json={**body, "horizon": "flat"}).status_code == 200


@needs_ldem
def test_square_map_limit_depends_on_longitude(client):
    """Same latitude, -84 deg: refused at lon 0 (edge of the square), accepted at lon 45 (diagonal)."""
    body = {"latDeg": -84.0, "start": START, "days": 2}
    assert client.post("/analysis", json={**body, "lonDeg": 0.0}).status_code == 422
    assert client.post("/analysis", json={**body, "lonDeg": 45.0}).status_code == 200


# ---------- POST /analysis: invalid requests ----------

@pytest.mark.parametrize("body, status", [
    ({"siteId": "tycho", "start": START}, 404),                      # unknown site
    ({"siteId": "malapert", "start": "14/11/2026"}, 422),            # wrong date format
    ({"siteId": "malapert", "start": START, "days": -5}, 422),       # negative period
    ({"siteId": "malapert", "start": START, "days": 367}, 422),      # more than one year
    ({"siteId": "malapert", "start": START, "days": 90, "stepMinutes": 1}, 422),  # too many steps
    ({"siteId": "malapert", "start": START, "horizon": "round"}, 422),            # unknown horizon kind
    ({"siteId": "malapert", "latDeg": -86, "lonDeg": 0, "start": START}, 422),    # both site and coords
    ({"latDeg": -86, "start": START}, 422),                          # latitude without longitude
    ({"latDeg": -95, "lonDeg": 0, "start": START}, 422),             # latitude out of range
    ({"latDeg": -86, "lonDeg": 200, "start": START}, 422),           # longitude out of range
])
def test_invalid_request_is_refused(client, body, status):
    assert client.post("/analysis", json=body).status_code == status


def test_missing_terrain_file_gives_a_clear_error(client, monkeypatch):
    monkeypatch.delenv("ASTRA_LDEM_PATH", raising=False)
    r = client.post("/analysis", json={"siteId": "malapert", "start": START})
    assert r.status_code == 503
    assert "ASTRA_LDEM_PATH" in r.json()["detail"]


# ---------- GET /horizon ----------

@needs_ldem
@pytest.mark.parametrize("site_id", CATALOGUE_IDS)
def test_horizon_matches_contract_example(client, site_id):
    r = client.get("/horizon", params={"siteId": site_id})
    assert r.status_code == 200
    assert r.json() == contract_example(f"horizon_{site_id}.json")


@needs_ldem
def test_horizon_for_custom_coordinates(client):
    r = client.get("/horizon", params={"latDeg": -86.0, "lonDeg": 0.1})
    ref = contract_example("horizon_malapert.json")
    assert r.status_code == 200
    assert r.json()["siteId"] == "custom"
    assert r.json()["elevDeg"] == ref["elevDeg"]


@needs_ldem
def test_horizon_refused_when_terrain_is_incomplete(client):
    r = client.get("/horizon", params={"latDeg": -84.0, "lonDeg": 0.0})
    assert r.status_code == 422


@pytest.mark.parametrize("params, status", [
    ({}, 422),                                             # nothing
    ({"siteId": "malapert", "latDeg": -86, "lonDeg": 0}, 422),  # both
    ({"latDeg": -86}, 422),                                # latitude only
    ({"siteId": "tycho"}, 404),                            # unknown site
])
def test_horizon_invalid_request(client, params, status):
    assert client.get("/horizon", params=params).status_code == status


# ---------- CORS: the frontend in a browser may call the API ----------

def test_cors_allows_the_local_frontend(client):
    origin = "http://localhost:5173"
    r = client.options("/analysis", headers={"Origin": origin, "Access-Control-Request-Method": "POST",
                                             "Access-Control-Request-Headers": "Content-Type"})
    assert r.status_code == 200
    assert r.headers["access-control-allow-origin"] == origin
    assert client.get("/sites", headers={"Origin": origin}).headers["access-control-allow-origin"] == origin


def test_cors_refuses_an_unknown_website(client):
    r = client.get("/sites", headers={"Origin": "https://unknown.example"})
    assert "access-control-allow-origin" not in r.headers
