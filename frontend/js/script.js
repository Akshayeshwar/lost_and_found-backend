const API_URL = "https://lost-and-found-iv6k.onrender.com/api";

function showSection(sectionId) {

    const sections = document.querySelectorAll(".section");

    sections.forEach(section => {
        section.classList.remove("active");
    });

    document.getElementById(sectionId).classList.add("active");

    if (sectionId === "items") {
        loadItems();
    }
}

async function loadItems() {

    try {

        const response = await fetch(`${API_URL}/items`);

        const items = await response.json();

        displayItems(items);

    } catch (error) {

        console.error("Error loading items:", error);

        document.getElementById("itemsList").innerHTML =
            "<p>Unable to load items. Make sure the backend server is running.</p>";
    }
}

function displayItems(items) {

    const itemsList = document.getElementById("itemsList");

    itemsList.innerHTML = "";

    if (items.length === 0) {
        itemsList.innerHTML = "<p>No items found.</p>";
        return;
    }

    items.forEach(item => {

        const card = document.createElement("div");

        card.className = "item-card";

        if (item.status === "LOST") {
            card.classList.add("lost");
        } else if (item.status === "FOUND") {
            card.classList.add("found");
        }

        const userName = item.user
            ? item.user.name
            : "Unknown";

        card.innerHTML = `
            <h3>${item.name}</h3>
            <p><strong>Description:</strong> ${item.description}</p>
            <p><strong>Location:</strong> ${item.location}</p>
            <p><strong>Status:</strong> ${item.status}</p>
            <p><strong>Date:</strong> ${item.date}</p>
            <p><strong>Reported By:</strong> ${userName}</p>
        `;

        itemsList.appendChild(card);
    });
}

async function searchItems() {

    const name = document.getElementById("searchName").value.trim();

    if (name === "") {
        loadItems();
        return;
    }

    try {

        const response =
            await fetch(`${API_URL}/items/search?name=${encodeURIComponent(name)}`);

        const items = await response.json();

        displayItems(items);

    } catch (error) {

        console.error("Search error:", error);
    }
}

async function filterItems(status) {

    try {

        const response =
            await fetch(`${API_URL}/items/status/${status}`);

        const items = await response.json();

        displayItems(items);

    } catch (error) {

        console.error("Filter error:", error);
    }
}

document.getElementById("itemForm").addEventListener("submit", async function(event) {

    event.preventDefault();

    const item = {

        name: document.getElementById("itemName").value,

        description: document.getElementById("itemDescription").value,

        location: document.getElementById("itemLocation").value,

        status: document.getElementById("itemStatus").value,

        date: document.getElementById("itemDate").value
    };

    const userId = document.getElementById("userId").value;

    try {

        const response =
            await fetch(`${API_URL}/items/user/${userId}`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(item)
            });

        if (!response.ok) {
            throw new Error("Failed to report item");
        }

        const text = await response.text(); if (!text) { throw new Error("Empty response - user ID may not exist"); } const savedItem = JSON.parse(text);

        document.getElementById("itemMessage").textContent =
            `Item "${savedItem.name}" reported successfully!`;

        document.getElementById("itemForm").reset();

    } catch (error) {

        console.error("Error:", error);

        document.getElementById("itemMessage").textContent =
            "Unable to report item: " + error.message;
    }
});

document.getElementById("loginForm").addEventListener("submit", async function(event) {

    event.preventDefault();

    const user = {

        email: document.getElementById("loginEmail").value,

        password: document.getElementById("loginPassword").value
    };

    try {

        const response =
            await fetch(`${API_URL}/users/login`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(user)
            });

        const result = await response.json();

        if (response.ok) {

            document.getElementById("loginMessage").textContent =
                result.message;

        } else {

            document.getElementById("loginMessage").textContent =
                "Login failed.";
        }

    } catch (error) {

        console.error("Login error:", error);

        document.getElementById("loginMessage").textContent =
            "Unable to connect to server.";
    }
});

document.getElementById("registerForm").addEventListener("submit", async function(event) {

    event.preventDefault();

    const user = {

        name: document.getElementById("registerName").value,

        email: document.getElementById("registerEmail").value,

        password: document.getElementById("registerPassword").value,

        role: document.getElementById("registerRole").value
    };

    try {

        const response =
            await fetch(`${API_URL}/users/register`, {

                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify(user)
            });

        const result = await response.json();

        if (response.ok) {

            document.getElementById("registerMessage").textContent =
                `Registration successful! Your User ID is ${result.id}`;

            document.getElementById("registerForm").reset();

        } else {

            document.getElementById("registerMessage").textContent =
                "Registration failed.";
        }

    } catch (error) {
    console.error("Registration error:", error);
    document.getElementById("registerMessage").textContent =
        "Error: " + error.message;
}

});

