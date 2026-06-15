import os
from azure.storage.blob import BlobServiceClient

connection_string = os.environ.get(
    "AZURE_STORAGE_CONNECTION_STRING",
    "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;"
)

blob_service_client = BlobServiceClient.from_connection_string(connection_string)
container_client = blob_service_client.get_container_client("datasets")

with open("All_Diets.csv", "rb") as data:
    container_client.upload_blob(
        name="All_Diets.csv",
        data=data,
        overwrite=True
    )
print("Upload complete")
