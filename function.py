import os
from azure.storage.blob import BlobServiceClient
import pandas as pd
import io
import json

CONNECTION_STRING = os.environ.get(
    "AZURE_STORAGE_CONNECTION_STRING",
    "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;"
)

def process_nutritional_data_from_azurite():
    blob_service_client = BlobServiceClient.from_connection_string(CONNECTION_STRING)

    container_name = "datasets"
    blob_name = "All_Diets.csv"

    container_client = blob_service_client.get_container_client(container_name)
    blob_client = container_client.get_blob_client(blob_name)

    stream = blob_client.download_blob().readall()
    df = pd.read_csv(io.BytesIO(stream))

    avg_macros = (
        df.groupby("Diet_type")
        [["Protein(g)", "Carbs(g)", "Fat(g)"]]
        .mean()
        .round(2)
    )
    result = avg_macros.reset_index().to_dict(orient="records")

    os.makedirs("simulated_nosql", exist_ok=True)
    with open("simulated_nosql/results.json", "w") as outfile:
        json.dump(result, outfile, indent=4)

    return "Data processed successfully"


if __name__ == "__main__":
    status = process_nutritional_data_from_azurite()
    print(status)
