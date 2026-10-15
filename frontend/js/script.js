// Dynamically detect local vs deployed environment
const API_URL = (window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
    ? "http://localhost:8080/api"
    : "/api";

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
        const data = await response.json();
        displayItems(data);
    } catch (error) {
        console.error("Error loading items:", error);
        document.getElementById("itemsList").innerHTML =
            "<p>Unable to load items. Make sure the backend server is running.</p>";
    }
}

function displayItems(responsePayload) {
    const itemsList = document.getElementById("itemsList");
    itemsList.innerHTML = "";

    const items = Array.isArray(responsePayload)
        ? responsePayload
        : (responsePayload && responsePayload.content ? responsePayload.content : []);

    if (items.length === 0) {
        itemsList.innerHTML = "<p>No items found.</p>";
        return;
    }

    items.forEach(item => {
        const card = document.createElement("div");
        card.className = "item-card";

        const itemType = (item.type || item.status || "").toUpperCase();
        if (itemType === "LOST") {
            card.classList.add("lost");
        } else if (itemType === "FOUND") {
            card.classList.add("found");
        }

        const userName = item.user ? item.user.name : "Unknown";
        const title = item.title || item.name;
        const date = item.reportDate || item.date;

        card.innerHTML = `
            <h3>${title} <span style="font-size: 0.8rem; padding: 2px 8px; border-radius: 4px; background: ${itemType === 'LOST' ? '#ffebee' : '#e8f5e9'}; color: ${itemType === 'LOST' ? '#c62828' : '#2e7d32'};">${itemType}</span></h3>
            <p><strong>Category:</strong> ${item.category || "OTHER"}</p>
            <p><strong>Description:</strong> ${item.description}</p>
            <p><strong>Location:</strong> ${item.location}</p>
            <p><strong>Status:</strong> ${item.status || "OPEN"}</p>
            <p><strong>Date:</strong> ${date}</p>
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
        const response = await fetch(`${API_URL}/items?search=${encodeURIComponent(name)}`);
        const data = await response.json();
        displayItems(data);
    } catch (error) {
        console.error("Search error:", error);
    }
}

async function filterItems(typeOrStatus) {
    try {
        const response = await fetch(`${API_URL}/items?type=${typeOrStatus}`);
        const data = await response.json();
        displayItems(data);
    } catch (error) {
        console.error("Filter error:", error);
    }
}

document.getElementById("itemForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const item = {
        title: document.getElementById("itemName").value,
        description: document.getElementById("itemDescription").value,
        location: document.getElementById("itemLocation").value,
        type: document.getElementById("itemStatus").value,
        reportDate: document.getElementById("itemDate").value
    };

    const userId = document.getElementById("userId").value;

    try {
        const url = userId ? `${API_URL}/items/user/${userId}` : `${API_URL}/items`;

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(item)
        });

        if (!response.ok) {
            const errorJson = await response.json().catch(() => null);
            throw new Error(errorJson && errorJson.message ? errorJson.message : await response.text());
        }

        const savedItem = await response.json();

        document.getElementById("itemMessage").textContent =
            `Item "${savedItem.title || savedItem.name}" reported successfully!`;

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
        const response = await fetch(`${API_URL}/users/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(user)
        });

        const result = await response.json();

        if (response.ok) {
            document.getElementById("loginMessage").textContent =
                `Welcome back, ${result.name}! (User ID: ${result.id})`;
            if (result.id) {
                document.getElementById("userId").value = result.id;
            }
        } else {
            document.getElementById("loginMessage").textContent =
                result.message || "Login failed.";
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
        const response = await fetch(`${API_URL}/users/register`, {
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
            document.getElementById("userId").value = result.id;
            document.getElementById("registerForm").reset();
        } else {
            document.getElementById("registerMessage").textContent =
                result.message || (result.validationErrors ? Object.values(result.validationErrors).join(", ") : "Registration failed.");
        }

    } catch (error) {
        console.error("Registration error:", error);
        document.getElementById("registerMessage").textContent =
            "Error: " + error.message;
    }
});
