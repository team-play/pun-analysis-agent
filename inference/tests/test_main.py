from fastapi.testclient import TestClient

from main import app

client = TestClient(app, raise_server_exceptions=False)


def test_analyze_endpoint_exists():
    # Handler isn't implemented yet — this just confirms the route and
    # request schema are wired up correctly (see docs/contracts.md).
    response = client.post("/analyze", json={"text": "I used to be a banker but I lost interest."})
    assert response.status_code == 500
