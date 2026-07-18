import io
import json
import logging
import os
import time
from datetime import datetime, timezone

import azure.functions as func
import pandas as pd
from azure.storage.blob import BlobServiceClient

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

CONTAINER_NAME = "project1grp7blob"
BLOB_NAME = "All_Diets.csv"


def _get_connection_string() -> str:
    conn_str = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
    if not conn_str:
        raise RuntimeError(
            "AZURE_STORAGE_CONNECTION_STRING app setting is not configured."
        )
    return conn_str


@app.route(route="GetNutritionData", methods=["GET", "POST"])
def get_nutrition_data(req: func.HttpRequest) -> func.HttpResponse:
    logging.info("GetNutritionData triggered.")
    start_time = time.perf_counter()

    try:
        blob_service_client = BlobServiceClient.from_connection_string(
            _get_connection_string()
        )
        container_client = blob_service_client.get_container_client(CONTAINER_NAME)
        blob_client = container_client.get_blob_client(BLOB_NAME)

        stream = blob_client.download_blob().readall()
        df = pd.read_csv(io.BytesIO(stream))

        avg_macros = (
            df.groupby("Diet_type")[["Protein(g)", "Carbs(g)", "Fat(g)"]]
            .mean()
            .round(2)
        )
        results = avg_macros.reset_index().to_dict(orient="records")

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        payload = {
            "status": "success",
            "data": results,
            "metadata": {
                "row_count": int(len(df)),
                "diet_types": int(avg_macros.shape[0]),
                "execution_time_ms": elapsed_ms,
                "generated_at_utc": datetime.now(timezone.utc).isoformat(),
                "source_blob": f"{CONTAINER_NAME}/{BLOB_NAME}",
            },
        }

        return func.HttpResponse(
            json.dumps(payload),
            status_code=200,
            mimetype="application/json",
            headers={"Access-Control-Allow-Origin": "*"},
        )

    except Exception as exc:
        logging.exception("GetNutritionData failed")
        error_payload = {"status": "error", "message": str(exc)}
        return func.HttpResponse(
            json.dumps(error_payload),
            status_code=500,
            mimetype="application/json",
            headers={"Access-Control-Allow-Origin": "*"},
        )