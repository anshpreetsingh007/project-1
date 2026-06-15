from azure.storage.blob import BlobServiceClient

connection_string = "UseDevelopmentStorage=true"

container_name = "datasets"

blob_service_client = BlobServiceClient.from_connection_string(
    connection_string
)

try:
    blob_service_client.create_container(container_name)
    print("Container created")
except Exception as e:
    print(e)
