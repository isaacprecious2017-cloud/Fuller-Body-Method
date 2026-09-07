document.addEventListener("DOMContentLoaded", async () => {

    const library = document.getElementById("pdfLibrary");

    if (!library) return;

    try {
        const response = await fetch("/api/customer/resources", {
            credentials: "same-origin"
        });

        if (response.status === 401 || response.status === 403) {
            window.location.href = "/login.html";
            return;
        }

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Unable to load your resources.");
        }

        const resources = Array.isArray(data.resources) ? data.resources : [];

        if (!resources.length) {
            library.innerHTML = `
                <div class="library-empty">
                    <div class="library-empty-icon">▣</div>
                    <h2>Your library is being prepared.</h2>
                    <p>Your private resources will appear here as soon as they are added.</p>
                </div>
            `;
            return;
        }

        library.innerHTML = resources.map(createResourceCard).join("");

    } catch (error) {
        console.error("Library error:", error);
        library.innerHTML = `
            <div class="library-empty">
                <div class="library-empty-icon">!</div>
                <h2>Unable to load your library.</h2>
                <p>${escapeHTML(error.message || "Please refresh and try again.")}</p>
            </div>
        `;
    }
});

function createResourceCard(resource) {
    const type = String(resource.type || "pdf").toLowerCase();
    const title = escapeHTML(resource.title || "Untitled Resource");

    const config = {
        pdf: ["📕", "PDF Guide", "Read Guide →"],
        image: ["🖼️", "Image", "View Image →"],
        video: ["🎥", "Video", "Watch Video →"],
        link: ["🔗", "External Link", "Open Resource →"]
    }[type] || ["📖", "Resource", "Open →"];

    let href = "#";
    let target = "";

    if (type === "link") {
        href = resource.url || "#";
        target = href !== "#" ? 'target="_blank" rel="noopener"' : "";
    } else if (resource.id) {
        href = `/reader.html?id=${encodeURIComponent(resource.id)}`;
    }

    return `
        <article class="library-resource-card">
            <div class="library-resource-icon">${config[0]}</div>
            <span class="library-resource-type">${config[1]}</span>
            <h3>${title}</h3>
            <p>Private member resource included with your purchase.</p>
            <a class="library-resource-button" href="${escapeAttribute(href)}" ${target}>
                ${config[2]}
            </a>
        </article>
    `;
}

function escapeHTML(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeAttribute(value) {
    return escapeHTML(value);
}
