const FUNCTION_URL = "https://project1-grp7-functionapp-fad3bsdsh4gzcegk.eastus2-01.azurewebsites.net/api/GetNutritionData";

let nutritionData = [];   // populated from the API
let lastMetadata = {};
let barChart, scatterChart, heatmapChart, pieChart;

// ====== FETCH DATA FROM AZURE FUNCTION ======
async function fetchNutritionData() {
    setLoadingState(true);

    try {
        const response = await fetch(FUNCTION_URL);

        if (!response.ok) {
            throw new Error(`Server responded with status ${response.status}`);
        }

        const payload = await response.json();

        if (payload.status !== "success") {
            throw new Error(payload.message || "Unknown API error");
        }

        // Map backend field names to what the charts expect
        nutritionData = payload.data.map(row => ({
            diet: row.Diet_type,
            protein: row["Protein(g)"],
            carbs: row["Carbs(g)"],
            fat: row["Fat(g)"]
        }));

        lastMetadata = payload.metadata;

        renderCharts();
        updateMetadata();
        populateDietFilter();

    } catch (err) {
        console.error("Failed to fetch nutrition data:", err);
        alert("Could not load data from the API: " + err.message);
    } finally {
        setLoadingState(false);
    }
}

function setLoadingState(isLoading) {
    const refreshBtn = document.getElementById("refreshButton");
    refreshBtn.disabled = isLoading;
    refreshBtn.textContent = isLoading ? "Loading..." : "Refresh Data";
}

// ====== CHART RENDERING ======
function renderCharts(filterDiet = "all") {
    const filtered = filterDiet === "all"
        ? nutritionData
        : nutritionData.filter(item => item.diet.toLowerCase() === filterDiet.toLowerCase());

    const labels = filtered.map(item => item.diet);

    // Destroy old chart instances before redrawing (avoids Chart.js canvas reuse errors)
    [barChart, scatterChart, heatmapChart, pieChart].forEach(c => c && c.destroy());

    // Bar chart — average macros by diet type
    barChart = new Chart(document.getElementById("barChart"), {
        type: "bar",
        data: {
            labels,
            datasets: [
                { label: "Protein (g)", data: filtered.map(i => i.protein) },
                { label: "Carbs (g)", data: filtered.map(i => i.carbs) },
                { label: "Fat (g)", data: filtered.map(i => i.fat) }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });

    // Scatter plot — protein vs carbs
    scatterChart = new Chart(document.getElementById("scatterChart"), {
        type: "scatter",
        data: {
            datasets: [{
                label: "Protein vs Carbs",
                data: filtered.map(i => ({ x: i.carbs, y: i.protein })),
                pointRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: "Carbs (g)" } },
                y: { title: { display: true, text: "Protein (g)" } }
            }
        }
    });

    // Heatmap-style horizontal bar — same macros, different view
    heatmapChart = new Chart(document.getElementById("heatmapChart"), {
        type: "bar",
        data: {
            labels,
            datasets: [
                { label: "Protein (g)", data: filtered.map(i => i.protein) },
                { label: "Carbs (g)", data: filtered.map(i => i.carbs) },
                { label: "Fat (g)", data: filtered.map(i => i.fat) }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, indexAxis: "y" }
    });

    // Pie chart — macro composition for the first diet in the filtered set
    const pieTarget = filtered[0];
    pieChart = new Chart(document.getElementById("pieChart"), {
        type: "pie",
        data: {
            labels: ["Protein", "Carbs", "Fat"],
            datasets: [{
                label: pieTarget ? `${pieTarget.diet} macro split` : "Macro split",
                data: pieTarget ? [pieTarget.protein, pieTarget.carbs, pieTarget.fat] : [0, 0, 0]
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

// ====== METADATA DISPLAY ======
function updateMetadata() {
    document.getElementById("totalRecipes").textContent =
        lastMetadata.row_count ?? "N/A";

    document.getElementById("executionTime").textContent =
        (lastMetadata.execution_time_ms ?? "N/A") + " ms";

    document.getElementById("lastUpdated").textContent =
        lastMetadata.generated_at_utc
            ? new Date(lastMetadata.generated_at_utc).toLocaleString()
            : new Date().toLocaleString();
}

// ====== FILTER DROPDOWN (populated dynamically from real diet types) ======
function populateDietFilter() {
    const select = document.getElementById("dietFilter");
    const current = select.value;
    select.innerHTML = '<option value="all">All Diet Types</option>';

    [...new Set(nutritionData.map(i => i.diet))].forEach(diet => {
        const opt = document.createElement("option");
        opt.value = diet;
        opt.textContent = diet;
        select.appendChild(opt);
    });

    select.value = current || "all";
}

// ====== EVENT LISTENERS ======
document.getElementById("refreshButton").addEventListener("click", fetchNutritionData);

document.getElementById("dietFilter").addEventListener("change", function () {
    const selectedText = this.options[this.selectedIndex].text;
    document.getElementById("selectedDiet").textContent = selectedText;
    renderCharts(this.value);
});

// Load real data when the page opens
fetchNutritionData();

// Check if user is logged in
async function checkLogin() {

    const response = await fetch(
        "http://localhost:3000/auth/status",
        {
            credentials: "include"
        }
    );

    const data = await response.json();

    if (!data.loggedIn) {
        window.location.href = "login.html";
        return;
    }

    document.getElementById("loggedUser").textContent =
        data.user.name;
}


// Logout button
const logoutButton =
    document.getElementById("logoutButton");

if (logoutButton) {

    logoutButton.addEventListener("click", async function () {

        await fetch(
            "http://localhost:3000/logout",
            {
                method: "POST",
                credentials: "include"
            }
        );

        window.location.href = "login.html";
    });
}


// Check login when dashboard opens
checkLogin();