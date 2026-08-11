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
            "http://localhost:3000/register",
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
            "http://localhost:3000/login",
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
            "http://localhost:3000/auth/google";
    });
}