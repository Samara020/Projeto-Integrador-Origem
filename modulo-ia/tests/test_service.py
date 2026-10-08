import os

from app.service import RecommendationService


def test_service_pode_ser_importado():
    assert RecommendationService is not None


def test_configuracao_de_simulacao_503():
    os.environ["MOCK_SERVICE_UNAVAILABLE"] = "true"

    assert os.getenv("MOCK_SERVICE_UNAVAILABLE") == "true"

    del os.environ["MOCK_SERVICE_UNAVAILABLE"]


def test_configuracao_de_simulacao_500():
    os.environ["MOCK_INTERNAL_ERROR"] = "true"

    assert os.getenv("MOCK_INTERNAL_ERROR") == "true"

    del os.environ["MOCK_INTERNAL_ERROR"]