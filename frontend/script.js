// Sample data for the dashboard
const nutritionData = [
    {
        diet: "Vegan",
        protein: 18,
        carbs: 45,
        fat: 12,
        recipes: 120
    },
    {
        diet: "Keto",
        protein: 30,
        carbs: 10,
        fat: 40,
        recipes: 90
    },
    {
        diet: "Paleo",
        protein: 28,
        carbs: 20,
        fat: 25,
        recipes: 80
    },
    {
        diet: "Mediterranean",
        protein: 22,
        carbs: 35,
        fat: 18,
        recipes: 110
    }
];


// Bar chart
const barChart = new Chart(
    document.getElementById("barChart"),
    {
        type: "bar",

        data: {
            labels: nutritionData.map(item => item.diet),

            datasets: [
                {
                    label: "Protein",
                    data: nutritionData.map(item => item.protein)
                },
                {
                    label: "Carbs",
                    data: nutritionData.map(item => item.carbs)
                },
                {
                    label: "Fat",
                    data: nutritionData.map(item => item.fat)
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
const scatterChart = new Chart(
    document.getElementById("scatterChart"),
    {
        type: "scatter",

        data: {
            datasets: [
                {
                    label: "Protein and Carbs",

                    data: nutritionData.map(item => ({
                        x: item.carbs,
                        y: item.protein
                    }))
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
                        text: "Carbs"
                    }
                },

                y: {
                    title: {
                        display: true,
                        text: "Protein"
                    }
                }
            }
        }
    }
);


// Simple heatmap using a horizontal bar chart
const heatmapChart = new Chart(
    document.getElementById("heatmapChart"),
    {
        type: "bar",

        data: {
            labels: nutritionData.map(item => item.diet),

            datasets: [
                {
                    label: "Protein",
                    data: nutritionData.map(item => item.protein)
                },
                {
                    label: "Carbs",
                    data: nutritionData.map(item => item.carbs)
                },
                {
                    label: "Fat",
                    data: nutritionData.map(item => item.fat)
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
const pieChart = new Chart(
    document.getElementById("pieChart"),
    {
        type: "pie",

        data: {
            labels: nutritionData.map(item => item.diet),

            datasets: [
                {
                    label: "Recipes",
                    data: nutritionData.map(item => item.recipes)
                }
            ]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    }
);


// Update dataset information
function updateMetadata() {

    const startTime = performance.now();

    const totalRecipes = nutritionData.reduce(
        (total, item) => total + item.recipes,
        0
    );

    const endTime = performance.now();

    document.getElementById("totalRecipes").textContent =
        totalRecipes;

    document.getElementById("executionTime").textContent =
        (endTime - startTime).toFixed(2) + " milliseconds";

    document.getElementById("lastUpdated").textContent =
        new Date().toLocaleString();
}


// Refresh button
document
    .getElementById("refreshButton")
    .addEventListener("click", function () {

        updateMetadata();

        alert("Dashboard data refreshed");
    });


// Diet filter
document
    .getElementById("dietFilter")
    .addEventListener("change", function () {

        const selectedDiet =
            this.options[this.selectedIndex].text;

        document.getElementById("selectedDiet").textContent =
            selectedDiet;

        console.log("Selected diet:", this.value);
    });


// Search input
document
    .getElementById("searchInput")
    .addEventListener("input", function () {

        console.log("Searching for:", this.value);
    });


// Nutritional insights button
document
    .getElementById("insightsButton")
    .addEventListener("click", function () {

        alert("Nutritional insights will be loaded from the API");
    });


// Recipes button
document
    .getElementById("recipesButton")
    .addEventListener("click", function () {

        alert("Recipes will be loaded from the API");
    });


// Clusters button
document
    .getElementById("clustersButton")
    .addEventListener("click", function () {

        alert("Clusters will be loaded from the API");
    });


// Previous page button
document
    .getElementById("previousButton")
    .addEventListener("click", function () {

        console.log("Previous page");
    });


// Next page button
document
    .getElementById("nextButton")
    .addEventListener("click", function () {

        console.log("Next page");
    });


// Page number buttons
const pageButtons =
    document.querySelectorAll(".page-button");

pageButtons.forEach(function (button) {

    button.addEventListener("click", function () {

        pageButtons.forEach(function (pageButton) {
            pageButton.classList.remove("active-page");
        });

        this.classList.add("active-page");

        console.log("Selected page:", this.textContent);
    });
});


// Load information when the page opens
updateMetadata();