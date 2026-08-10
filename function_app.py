import io
import json
import logging
import os
import time
from datetime import datetime, timezone

import azure.functions as func
import pandas as pd
from azure.storage.blob import BlobServiceClient
from azure.cosmos import CosmosClient, PartitionKey
from azure.cosmos import exceptions as cosmos_exceptions

app = func.FunctionApp(http_auth_level=func.AuthLevel.ANONYMOUS)

CONTAINER_NAME = "project1grp7blob"
BLOB_NAME = "All_Diets.csv"
CLEANED_BLOB_NAME = "All_Diets_cleaned.csv"
NUMERIC_COLS = ["Protein(g)", "Carbs(g)", "Fat(g)"]

COSMOS_DATABASE = os.environ.get("COSMOS_DATABASE", "DietAnalysisDB")
COSMOS_CONTAINER = os.environ.get("COSMOS_CONTAINER", "NutritionCache")
CACHE_DOC_ID = "nutrition_summary"


def _get_blob_connection_string() -> str:
    conn_str = os.environ.get("AZURE_STORAGE_CONNECTION_STRING")
    if not conn_str:
        raise RuntimeError(
            "AZURE_STORAGE_CONNECTION_STRING app setting is not configured."
        )
    return conn_str


def _get_cosmos_client() -> CosmosClient:
    endpoint = os.environ.get("COSMOS_ENDPOINT")
    key = os.environ.get("COSMOS_KEY")
    if not endpoint or not key:
        raise RuntimeError(
            "COSMOS_ENDPOINT / COSMOS_KEY app settings are not configured."
        )
    return CosmosClient(endpoint, credential=key)


def _get_cosmos_container(ensure_exists: bool = False):
    client = _get_cosmos_client()
    if ensure_exists:
        database = client.create_database_if_not_exists(id=COSMOS_DATABASE)
        container = database.create_container_if_not_exists(
            id=COSMOS_CONTAINER, partition_key=PartitionKey(path="/id")
        )
    else:
        database = client.get_database_client(COSMOS_DATABASE)
        container = database.get_container_client(COSMOS_CONTAINER)
    return container


def _clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    df = df.copy()
    df[NUMERIC_COLS] = df[NUMERIC_COLS].fillna(df[NUMERIC_COLS].mean())
    df["Diet_type"] = df["Diet_type"].astype(str).str.strip().str.title()
    df = df.drop_duplicates()
    return df


def _calculate_visualizations(df: pd.DataFrame) -> dict:
    avg_macros = df.groupby("Diet_type")[NUMERIC_COLS].mean().round(2)

    diet_counts = df["Diet_type"].value_counts()

    top_protein = (
        df.sort_values("Protein(g)", ascending=False)
        .groupby("Diet_type")
        .head(5)[["Diet_type", "Recipe_name", "Protein(g)"]]
    )

    macro_correlation = df[NUMERIC_COLS].corr().round(2)

    return {
        "avg_macros": avg_macros.reset_index().to_dict(orient="records"),
        "diet_counts": [
            {"Diet_type": diet, "count": int(count)}
            for diet, count in diet_counts.items()
        ],
        "top_protein": top_protein.to_dict(orient="records"),
        "macro_correlation": macro_correlation.to_dict(),
        "row_count": int(len(df)),
        "diet_types": int(avg_macros.shape[0]),
    }


def _process_and_cache(reason: str) -> dict:
    start = time.perf_counter()

    blob_service_client = BlobServiceClient.from_connection_string(
        _get_blob_connection_string()
    )
    container_client = blob_service_client.get_container_client(CONTAINER_NAME)

    raw_bytes = container_client.get_blob_client(BLOB_NAME).download_blob().readall()
    df = pd.read_csv(io.BytesIO(raw_bytes))

    cleaned_df = _clean_dataframe(df)

    cleaned_csv_bytes = cleaned_df.to_csv(index=False).encode("utf-8")
    container_client.get_blob_client(CLEANED_BLOB_NAME).upload_blob(
        cleaned_csv_bytes, overwrite=True
    )

    calculations = _calculate_visualizations(cleaned_df)
    generation_time_ms = round((time.perf_counter() - start) * 1000, 2)

    cache_doc = {
        "id": CACHE_DOC_ID,
        "source_blob": f"{CONTAINER_NAME}/{BLOB_NAME}",
        "cleaned_blob": f"{CONTAINER_NAME}/{CLEANED_BLOB_NAME}",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "generation_time_ms": generation_time_ms,
        "trigger_reason": reason,
        **calculations,
    }

    container = _get_cosmos_container(ensure_exists=True)
    container.upsert_item(cache_doc)

    logging.info(
        "Cache refreshed (%s): %s rows, %s diet types, %.2fms",
        reason,
        cache_doc["row_count"],
        cache_doc["diet_types"],
        generation_time_ms,
    )
    return cache_doc


@app.function_name(name="CleanDataOnUpload")
@app.blob_trigger(
    arg_name="myblob",
    path=f"{CONTAINER_NAME}/{BLOB_NAME}",
    connection="AZURE_STORAGE_CONNECTION_STRING",
)
def clean_data_on_upload(myblob: func.InputStream) -> None:
    logging.info(
        "Blob trigger fired for %s (%s bytes) - starting clean + cache refresh.",
        myblob.name,
        myblob.length,
    )
    _process_and_cache(reason="blob_trigger")


@app.route(route="GetNutritionData", methods=["GET", "POST"])
def get_nutrition_data(req: func.HttpRequest) -> func.HttpResponse:
    logging.info("GetNutritionData triggered.")
    start_time = time.perf_counter()

    try:
        container = _get_cosmos_container(ensure_exists=False)
        try:
            doc = container.read_item(item=CACHE_DOC_ID, partition_key=CACHE_DOC_ID)
            data_source = "cache"
        except cosmos_exceptions.CosmosResourceNotFoundError:
            doc = _process_and_cache(reason="http_fallback_first_run")
            data_source = "live-fallback"

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        payload = {
            "status": "success",
            "data": doc["avg_macros"],
            "metadata": {
                "row_count": doc["row_count"],
                "diet_types": doc["diet_types"],
                "execution_time_ms": elapsed_ms,
                "generated_at_utc": doc["generated_at_utc"],
                "source_blob": doc["source_blob"],
                "data_source": data_source,
            },
            "insights": {
                "diet_counts": doc["diet_counts"],
                "top_protein": doc["top_protein"],
                "macro_correlation": doc["macro_correlation"],
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