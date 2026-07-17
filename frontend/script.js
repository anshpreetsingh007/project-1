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


// Simple heatmap using a bar chart
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

        console.log("Selected diet:", this.value);
    });


// Search input
document
    .getElementById("searchInput")
    .addEventListener("input", function () {

        console.log("Searching for:", this.value);
    });


// Load information when the page opens
updateMetadata();