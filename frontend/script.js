const AUTH_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://project1-grp7-auth-eudpe7efbtfufhfg.eastus2-01.azurewebsites.net";


const FUNCTION_BASE_URL =
    "https://project1-grp7-functionapp-fad3bsdsh4gzcegk.eastus2-01.azurewebsites.net/api";

const FUNCTION_URL = `${FUNCTION_BASE_URL}/GetNutritionData`;
const RECIPES_URL = `${FUNCTION_BASE_URL}/GetRecipes`;

let nutritionData = [];
let lastMetadata = {};

let barChart;
let scatterChart;
let heatmapChart;
let pieChart;


// ====== RECIPE SEARCH / FILTER / PAGINATION STATE ======
const PAGE_SIZE = 12;

let recipeState = {
    diet: "all",
    search: "",
    page: 1,
    totalPages: 1
};


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


// ====== FETCH RECIPES (filter + keyword search + pagination) ======
async function fetchRecipes() {

    const list = document.getElementById("recipeList");
    const summary = document.getElementById("recipeResultsSummary");

    summary.textContent = "Loading recipes...";

    try {

        const params = new URLSearchParams({
            diet: recipeState.diet,
            search: recipeState.search,
            page: recipeState.page,
            page_size: PAGE_SIZE
        });

        const response =
            await fetch(`${RECIPES_URL}?${params.toString()}`);

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

        recipeState.page =
            payload.pagination.page;

        recipeState.totalPages =
            payload.pagination.total_pages;

        renderRecipeList(payload.data);
        renderPagination();

        summary.textContent =
            payload.pagination.total_items === 0
                ? "No recipes match your filters."
                : `Showing ${payload.data.length} of ${payload.pagination.total_items} recipes`
                    + (recipeState.diet !== "all"
                        ? ` · Diet: ${recipeState.diet}`
                        : "")
                    + (recipeState.search
                        ? ` · Search: "${recipeState.search}"`
                        : "");

    } catch (err) {

        console.error(
            "Failed to fetch recipes:",
            err
        );

        summary.textContent =
            "Could not load recipes: " +
            err.message;

        list.innerHTML = "";
    }
}


// ====== RENDER RECIPE LIST ======
function renderRecipeList(recipes) {

    const list =
        document.getElementById("recipeList");

    list.innerHTML = "";

    recipes.forEach(recipe => {

        const card =
            document.createElement("div");

        card.className = "recipe-card";

        card.innerHTML = `
            <h4>${recipe.Recipe_name}</h4>

            <p class="recipe-meta">
                <span class="recipe-diet">${recipe.Diet_type}</span>
                &middot; ${recipe.Cuisine_type}
            </p>

            <p class="recipe-macros">
                Protein: ${recipe["Protein(g)"]}g &middot;
                Carbs: ${recipe["Carbs(g)"]}g &middot;
                Fat: ${recipe["Fat(g)"]}g
            </p>
        `;

        list.appendChild(card);
    });
}


// ====== RENDER PAGINATION CONTROLS ======
function renderPagination() {

    const pageNumbers =
        document.getElementById("pageNumbers");

    const previousButton =
        document.getElementById("previousButton");

    const nextButton =
        document.getElementById("nextButton");

    pageNumbers.innerHTML = "";

    const current =
        recipeState.page;

    const total =
        recipeState.totalPages;

    // Show a small window of page buttons around the current page
    const windowSize = 2;

    let start =
        Math.max(
            1,
            current - windowSize
        );

    let end =
        Math.min(
            total,
            current + windowSize
        );

    if (start > 1) {

        pageNumbers.appendChild(
            makePageButton(1)
        );

        if (start > 2) {

            const ellipsis =
                document.createElement("span");

            ellipsis.textContent = "...";
            ellipsis.className = "page-ellipsis";

            pageNumbers.appendChild(
                ellipsis
            );
        }
    }

    for (
        let pageNum = start;
        pageNum <= end;
        pageNum++
    ) {
        pageNumbers.appendChild(
            makePageButton(pageNum)
        );
    }

    if (end < total) {

        if (end < total - 1) {

            const ellipsis =
                document.createElement("span");

            ellipsis.textContent = "...";
            ellipsis.className = "page-ellipsis";

            pageNumbers.appendChild(
                ellipsis
            );
        }

        pageNumbers.appendChild(
            makePageButton(total)
        );
    }

    previousButton.disabled =
        current <= 1;

    nextButton.disabled =
        current >= total;
}


function makePageButton(pageNum) {

    const button =
        document.createElement("button");

    button.textContent = pageNum;

    button.className =
        "page-button" +
        (
            pageNum === recipeState.page
                ? " active-page"
                : ""
        );

    button.addEventListener(
        "click",
        function () {

            recipeState.page =
                pageNum;

            fetchRecipes();
        }
    );

    return button;
}


// ====== CHECK LOGIN ======
async function checkLogin() {

    try {

        const response = await fetch(
            `${AUTH_URL}/auth/status`,
            {
                credentials: "include"
            }
        );

        const data =
            await response.json();


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
                `${AUTH_URL}/logout`,
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

            // Re-run the recipe search with the new diet filter, resetting to page 1
            recipeState.diet =
                this.value;

            recipeState.page = 1;

            fetchRecipes();
        }
    );


// ====== KEYWORD SEARCH ======
function runSearch() {

    const searchInput =
        document.getElementById(
            "searchInput"
        );

    recipeState.search =
        searchInput.value.trim();

    recipeState.page = 1;

    fetchRecipes();
}


document
    .getElementById("searchButton")
    .addEventListener(
        "click",
        runSearch
    );


document
    .getElementById("searchInput")
    .addEventListener(
        "keydown",
        function (event) {

            if (event.key === "Enter") {
                runSearch();
            }
        }
    );


document
    .getElementById("recipesButton")
    .addEventListener(
        "click",
        function () {

            recipeState.page = 1;

            fetchRecipes();
        }
    );


// ====== PAGINATION BUTTONS ======
document
    .getElementById("previousButton")
    .addEventListener(
        "click",
        function () {

            if (recipeState.page > 1) {

                recipeState.page -= 1;

                fetchRecipes();
            }
        }
    );


document
    .getElementById("nextButton")
    .addEventListener(
        "click",
        function () {

            if (
                recipeState.page <
                recipeState.totalPages
            ) {

                recipeState.page += 1;

                fetchRecipes();
            }
        }
    );


// ====== START DASHBOARD ======
async function startDashboard() {

    const loggedIn =
        await checkLogin();

    if (loggedIn) {

        fetchNutritionData();
        fetchRecipes();
    }
}


startDashboard();