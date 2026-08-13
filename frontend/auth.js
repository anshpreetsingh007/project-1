// Auth backend URL
const AUTH_URL =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
        ? "http://localhost:3000"
        : "https://project1-grp7-auth-eudpe7efbtfufhfg.eastus2-01.azurewebsites.net";


// Register form
const registerForm = document.getElementById("registerForm");

if (registerForm) {

    registerForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const name =
            document.getElementById("registerName").value;

        const email =
            document.getElementById("registerEmail").value;

        const password =
            document.getElementById("registerPassword").value;

        const response = await fetch(
            `${AUTH_URL}/register`,
            {
                method: "POST",
                credentials: "include",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password
                })
            }
        );

        const data = await response.json();

        alert(data.message);

        if (response.ok) {
            window.location.href = "index.html";
        }
    });
}


// Login form
const loginForm = document.getElementById("loginForm");

if (loginForm) {

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        const email =
            document.getElementById("loginEmail").value;

        const password =
            document.getElementById("loginPassword").value;

        const response = await fetch(
            `${AUTH_URL}/login`,
            {
                method: "POST",
                credentials: "include",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email: email,
                    password: password
                })
            }
        );

        const data = await response.json();

        alert(data.message);

        if (response.ok) {
            window.location.href = "index.html";
        }
    });
}


// Google login button
const googleButton =
    document.getElementById("googleLoginButton");

if (googleButton) {

    googleButton.addEventListener("click", function () {

        window.location.href =
            `${AUTH_URL}/auth/google`;
    });
}