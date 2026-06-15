from azure.storage.blob import BlobServiceClient

connection_string = ("UseDevelopmentStorage=true")

blob_service_client = BlobServiceClient.from_connection_string(
    connection_string
)

container_client = blob_service_client.get_container_client("datasets")

with open("All_Diets.csv", "rb") as data:
    container_client.upload_blob(
        name="All_Diets.csv",
        data=data,
        overwrite=True
    )

print("Upload complete")
