"""
Unit tests for function.py

These tests mock the Azure Blob Storage SDK so they can run in any environment
without a live Azurite instance. The full end-to-end pipeline (with real Azurite)
is exercised by the 'simulate-pipeline' job in the CI/CD workflow.
"""

import io
import json
import os
import sys
import pytest
from unittest.mock import MagicMock, patch

# ── Make sure the project root is on the path ──────────────────────────────────
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ── Minimal CSV that mirrors All_Diets.csv structure ──────────────────────────
MOCK_CSV = (
    "Diet_type,Recipe_name,Cuisine_type,Protein(g),Carbs(g),Fat(g),"
    "Extraction_day,Extraction_time\n"
    "paleo,Recipe A,american,30.0,10.0,15.0,10/16/2022,17:20:09\n"
    "paleo,Recipe B,american,20.0,20.0,5.0,10/16/2022,17:20:09\n"
    "vegan,Recipe C,italian,10.0,50.0,2.0,10/16/2022,17:20:09\n"
    "keto,Recipe D,american,40.0,5.0,35.0,10/16/2022,17:20:09\n"
)


def _make_mock_blob_client(csv_bytes: bytes) -> MagicMock:
    """Return a mock BlobServiceClient whose download path yields csv_bytes."""
    mock_download = MagicMock()
    mock_download.readall.return_value = csv_bytes

    mock_blob_client = MagicMock()
    mock_blob_client.download_blob.return_value = mock_download

    mock_container_client = MagicMock()
    mock_container_client.get_blob_client.return_value = mock_blob_client

    mock_service_client = MagicMock()
    mock_service_client.get_container_client.return_value = mock_container_client

    return mock_service_client


# ── Tests ──────────────────────────────────────────────────────────────────────

class TestProcessNutritionalData:
    """Tests for process_nutritional_data_from_azurite()."""

    @patch("function.BlobServiceClient")
    def test_returns_success_message(self, mock_blob_cls, tmp_path, monkeypatch):
        """Function should return a success string."""
        monkeypatch.chdir(tmp_path)
        mock_blob_cls.from_connection_string.return_value = _make_mock_blob_client(
            MOCK_CSV.encode()
        )

        from function import process_nutritional_data_from_azurite
        result = process_nutritional_data_from_azurite()

        assert result == "Data processed successfully"

    @patch("function.BlobServiceClient")
    def test_creates_results_json(self, mock_blob_cls, tmp_path, monkeypatch):
        """Function must write simulated_nosql/results.json."""
        monkeypatch.chdir(tmp_path)
        mock_blob_cls.from_connection_string.return_value = _make_mock_blob_client(
            MOCK_CSV.encode()
        )

        from function import process_nutritional_data_from_azurite
        process_nutritional_data_from_azurite()

        output_path = tmp_path / "simulated_nosql" / "results.json"
        assert output_path.exists(), "results.json was not created"

    @patch("function.BlobServiceClient")
    def test_results_json_is_valid_json(self, mock_blob_cls, tmp_path, monkeypatch):
        """The output file must be parseable JSON."""
        monkeypatch.chdir(tmp_path)
        mock_blob_cls.from_connection_string.return_value = _make_mock_blob_client(
            MOCK_CSV.encode()
        )

        from function import process_nutritional_data_from_azurite
        process_nutritional_data_from_azurite()

        output_path = tmp_path / "simulated_nosql" / "results.json"
        with open(output_path) as f:
            data = json.load(f)

        assert isinstance(data, list), "Top-level JSON should be a list of records"

    @patch("function.BlobServiceClient")
    def test_results_contain_expected_diet_types(self, mock_blob_cls, tmp_path, monkeypatch):
        """Each record must include Diet_type and the three macro columns."""
        monkeypatch.chdir(tmp_path)
        mock_blob_cls.from_connection_string.return_value = _make_mock_blob_client(
            MOCK_CSV.encode()
        )

        from function import process_nutritional_data_from_azurite
        process_nutritional_data_from_azurite()

        output_path = tmp_path / "simulated_nosql" / "results.json"
        with open(output_path) as f:
            data = json.load(f)

        diet_types = {record["Diet_type"] for record in data}
        assert "paleo" in diet_types
        assert "vegan" in diet_types
        assert "keto" in diet_types

    @patch("function.BlobServiceClient")
    def test_macros_are_averaged_correctly(self, mock_blob_cls, tmp_path, monkeypatch):
        """Paleo average protein should be mean of 30.0 and 20.0 = 25.0."""
        monkeypatch.chdir(tmp_path)
        mock_blob_cls.from_connection_string.return_value = _make_mock_blob_client(
            MOCK_CSV.encode()
        )

        from function import process_nutritional_data_from_azurite
        process_nutritional_data_from_azurite()

        output_path = tmp_path / "simulated_nosql" / "results.json"
        with open(output_path) as f:
            data = json.load(f)

        paleo = next(r for r in data if r["Diet_type"] == "paleo")
        assert paleo["Protein(g)"] == pytest.approx(25.0, rel=1e-2)
        assert paleo["Carbs(g)"] == pytest.approx(15.0, rel=1e-2)
        assert paleo["Fat(g)"] == pytest.approx(10.0, rel=1e-2)

    @patch("function.BlobServiceClient")
    def test_record_schema(self, mock_blob_cls, tmp_path, monkeypatch):
        """Every record must have exactly the four expected keys."""
        monkeypatch.chdir(tmp_path)
        mock_blob_cls.from_connection_string.return_value = _make_mock_blob_client(
            MOCK_CSV.encode()
        )

        from function import process_nutritional_data_from_azurite
        process_nutritional_data_from_azurite()

        output_path = tmp_path / "simulated_nosql" / "results.json"
        with open(output_path) as f:
            data = json.load(f)

        expected_keys = {"Diet_type", "Protein(g)", "Carbs(g)", "Fat(g)"}
        for record in data:
            assert set(record.keys()) == expected_keys, (
                f"Unexpected schema in record: {record}"
            )
