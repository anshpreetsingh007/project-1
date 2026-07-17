#!/usr/bin/env bash
# ============================================================================
# deploy.sh — Ansh's Azure Cloud & Backend setup
#
# Run from your machine (needs Azure CLI + Azure Functions Core Tools
# installed, and you must be logged in: `az login`).
# Run it line-by-line the first time rather than piping straight into bash.
# ============================================================================

set -euo pipefail

# ---- 1. Variables — edit to be unique ----
RESOURCE_GROUP="diet-analysis-rg"
LOCATION="eastus"
STORAGE_ACCOUNT="dietanalysisstore$RANDOM"   # must be globally unique, lowercase, no dashes
CONTAINER_NAME="datasets"
FUNCTION_APP="diet-analysis-func-$RANDOM"    # must be globally unique
PLAN_NAME="diet-analysis-plan"

echo "Resource group : $RESOURCE_GROUP"
echo "Storage account: $STORAGE_ACCOUNT"
echo "Function app   : $FUNCTION_APP"

# ---- 2. Create the Resource Group ----
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION"

# ---- 3. Create the Storage Account ----
az storage account create \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --sku Standard_LRS

STORAGE_CONNECTION_STRING=$(az storage account show-connection-string \
  --name "$STORAGE_ACCOUNT" \
  --resource-group "$RESOURCE_GROUP" \
  --query connectionString -o tsv)

echo "Connection string retrieved (kept in shell var, not printed)."

# ---- 4. Create the Blob Container ----
az storage container create \
  --name "$CONTAINER_NAME" \
  --connection-string "$STORAGE_CONNECTION_STRING"

# ---- 5. Upload the dataset ----
az storage blob upload \
  --connection-string "$STORAGE_CONNECTION_STRING" \
  --container-name "$CONTAINER_NAME" \
  --name "All_Diets.csv" \
  --file "All_Diets.csv" \
  --overwrite

# ---- 6. Create the Function App (Linux, Consumption plan, Python 3.11) ----
az functionapp create \
  --name "$FUNCTION_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --storage-account "$STORAGE_ACCOUNT" \
  --consumption-plan-location "$LOCATION" \
  --runtime python \
  --runtime-version 3.11 \
  --functions-version 4 \
  --os-type Linux

# ---- 7. Configure app settings / connection string ----
az functionapp config appsettings set \
  --name "$FUNCTION_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --settings "AZURE_STORAGE_CONNECTION_STRING=$STORAGE_CONNECTION_STRING"

az functionapp cors add \
  --name "$FUNCTION_APP" \
  --resource-group "$RESOURCE_GROUP" \
  --allowed-origins "*"

# ---- 8. Deploy the function code ----
# Run from the project root (where function_app.py and host.json live)
func azure functionapp publish "$FUNCTION_APP"

# ---- 9. Print the deployed endpoint URL ----
echo ""
echo "=========================================================="
echo "Deployment complete."
echo "Your Azure Function URL is:"
echo "https://$FUNCTION_APP.azurewebsites.net/api/GetNutritionData"
echo "=========================================================="