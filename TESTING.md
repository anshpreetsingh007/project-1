# Testing the Deployed Azure Function

URL shape: https://<your-function-app-name>.azurewebsites.net/api/GetNutritionData

## 1. Browser test
Paste the URL into a browser tab. Should return JSON like:

{
  "status": "success",
  "data": [
    {"Diet_type": "keto", "Protein(g)": 32.1, "Carbs(g)": 9.4, "Fat(g)": 41.2}
  ],
  "metadata": {
    "row_count": 7806,
    "diet_types": 5,
    "execution_time_ms": 184.3,
    "generated_at_utc": "2026-07-17T18:04:00.123456+00:00",
    "source_blob": "datasets/All_Diets.csv"
  }
}

## 2. curl / Postman
curl -i "https://<your-function-app-name>.azurewebsites.net/api/GetNutritionData"

## 3. If 500 error
- Check app setting exists:
  az functionapp config appsettings list --name <app-name> --resource-group diet-analysis-rg --query "[?name=='AZURE_STORAGE_CONNECTION_STRING']"
- Check blob exists:
  az storage blob list --connection-string "<connection-string>" --container-name datasets --output table
- Stream logs:
  func azure functionapp logstream <app-name>

## 4. If 404
- Route is exactly /api/GetNutritionData, case-sensitive.
- Confirm deployment:
  az functionapp function list --name <app-name> --resource-group diet-analysis-rg -o table

## 5. Hand off
Send Diego and Sven the working URL + note that CORS is open (*) + the JSON shape above.