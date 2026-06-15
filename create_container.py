import os
from azure.storage.blob import BlobServiceClient

connection_string = os.environ.get(
    "AZURE_STORAGE_CONNECTION_STRING",
    "DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6ImpFQjSjbZ+pM3hq9NAdnhN+Q==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;"
)

container_name = "datasets"
blob_service_client = BlobServiceClient.from_connection_string(connection_string)

try:
    blob_service_client.create_container(container_name)
    print("Container created")
except Exception as e:
    print(e)
