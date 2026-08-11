const FUNCTION_URL =
    "https://project1-grp7-functionapp-fad3bsdsh4gzcegk.eastus2-01.azurewebsites.net/api/GetNutritionData";

let nutritionData = [];
let lastMetadata = {};

let barChart;
let scatterChart;
let heatmapChart;
let pieChart;


// ====== FETCH DATA FROM AZURE FUNCTION ======
async function fetchNutritionData() {

    setLoadingState(true);

    try {

        const response = await fetch(FUNCTION_URL);

        if (!response.ok) {
            throw new Error(
                `Server responded with status ${response.status}`
            );
        }

        const payload = await response.json();

        if (payload.status !== "success") {
            throw new Error(
                payload.message || "Unknown API error"
            );
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

        console.error(
            "Failed to fetch nutrition data:",
            err
        );

        alert(
            "Could not load data from the API: " +
            err.message
        );

    } finally {

        setLoadingState(false);
    }
}


// ====== LOADING STATE ======
function setLoadingState(isLoading) {

    const refreshBtn =
        document.getElementById("refreshButton");

    refreshBtn.disabled = isLoading;

    refreshBtn.textContent =
        isLoading ? "Loading..." : "Refresh Data";
}


// ====== CHART RENDERING ======
function renderCharts(filterDiet = "all") {

    const filtered =
        filterDiet === "all"
            ? nutritionData
            : nutritionData.filter(
                item =>
                    item.diet.toLowerCase() ===
                    filterDiet.toLowerCase()
            );

    const labels =
        filtered.map(item => item.diet);


    // Destroy old chart instances before redrawing
    [
        barChart,
        scatterChart,
        heatmapChart,
        pieChart
    ].forEach(chart => {

        if (chart) {
            chart.destroy();
        }
    });


    // Bar chart
    barChart = new Chart(
        document.getElementById("barChart"),
        {
            type: "bar",

            data: {
                labels: labels,

                datasets: [
                    {
                        label: "Protein (g)",
                        data: filtered.map(
                            item => item.protein
                        )
                    },
                    {
                        label: "Carbs (g)",
                        data: filtered.map(
                            item => item.carbs
                        )
                    },
                    {
                        label: "Fat (g)",
                        data: filtered.map(
                            item => item.fat
                        )
                    }
                ]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        }
    );


    // Scatter plot
    scatterChart = new Chart(
        document.getElementById("scatterChart"),
        {
            type: "scatter",

            data: {
                datasets: [
                    {
                        label: "Protein vs Carbs",

                        data: filtered.map(item => ({
                            x: item.carbs,
                            y: item.protein
                        })),

                        pointRadius: 6
                    }
                ]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                scales: {
                    x: {
                        title: {
                            display: true,
                            text: "Carbs (g)"
                        }
                    },

                    y: {
                        title: {
                            display: true,
                            text: "Protein (g)"
                        }
                    }
                }
            }
        }
    );


    // Heatmap-style horizontal bar chart
    heatmapChart = new Chart(
        document.getElementById("heatmapChart"),
        {
            type: "bar",

            data: {
                labels: labels,

                datasets: [
                    {
                        label: "Protein (g)",
                        data: filtered.map(
                            item => item.protein
                        )
                    },
                    {
                        label: "Carbs (g)",
                        data: filtered.map(
                            item => item.carbs
                        )
                    },
                    {
                        label: "Fat (g)",
                        data: filtered.map(
                            item => item.fat
                        )
                    }
                ]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: "y"
            }
        }
    );


    // Pie chart
    const pieTarget = filtered[0];

    pieChart = new Chart(
        document.getElementById("pieChart"),
        {
            type: "pie",

            data: {
                labels: [
                    "Protein",
                    "Carbs",
                    "Fat"
                ],

                datasets: [
                    {
                        label: pieTarget
                            ? `${pieTarget.diet} macro split`
                            : "Macro split",

                        data: pieTarget
                            ? [
                                pieTarget.protein,
                                pieTarget.carbs,
                                pieTarget.fat
                            ]
                            : [0, 0, 0]
                    }
                ]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        }
    );
}


// ====== METADATA DISPLAY ======
function updateMetadata() {

    document.getElementById(
        "totalRecipes"
    ).textContent =
        lastMetadata.row_count ?? "N/A";


    document.getElementById(
        "executionTime"
    ).textContent =
        (lastMetadata.execution_time_ms ?? "N/A")
        + " ms";


    document.getElementById(
        "lastUpdated"
    ).textContent =
        lastMetadata.generated_at_utc
            ? new Date(
                lastMetadata.generated_at_utc
            ).toLocaleString()
            : new Date().toLocaleString();
}


// ====== FILTER DROPDOWN ======
function populateDietFilter() {

    const select =
        document.getElementById("dietFilter");

    const current = select.value;

    select.innerHTML =
        '<option value="all">All Diet Types</option>';


    const dietTypes = [
        ...new Set(
            nutritionData.map(item => item.diet)
        )
    ];


    dietTypes.forEach(diet => {

        const option =
            document.createElement("option");

        option.value = diet;
        option.textContent = diet;

        select.appendChild(option);
    });


    select.value = current || "all";
}


// ====== CHECK LOGIN ======
async function checkLogin() {

    try {

        const response = await fetch(
            "http://localhost:3000/auth/status",
            {
                credentials: "include"
            }
        );

        const data = await response.json();


        if (!data.loggedIn) {

            window.location.href =
                "login.html";

            return false;
        }


        document.getElementById(
            "loggedUser"
        ).textContent =
            data.user.name;

        return true;

    } catch (error) {

        console.error(
            "Could not check login status:",
            error
        );

        window.location.href =
            "login.html";

        return false;
    }
}


// ====== LOGOUT ======
const logoutButton =
    document.getElementById("logoutButton");

if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        async function () {

            await fetch(
                "http://localhost:3000/logout",
                {
                    method: "POST",
                    credentials: "include"
                }
            );

            window.location.href =
                "login.html";
        }
    );
}


// ====== EVENT LISTENERS ======
document
    .getElementById("refreshButton")
    .addEventListener(
        "click",
        fetchNutritionData
    );


document
    .getElementById("dietFilter")
    .addEventListener(
        "change",
        function () {

            const selectedText =
                this.options[
                    this.selectedIndex
                ].text;

            document.getElementById(
                "selectedDiet"
            ).textContent =
                selectedText;

            renderCharts(this.value);
        }
    );


// ====== START DASHBOARD ======
async function startDashboard() {

    const loggedIn =
        await checkLogin();

    if (loggedIn) {
        fetchNutritionData();
    }
}


startDashboard();