document.addEventListener("DOMContentLoaded", () => {


    /* =========================================================
       ELEMENTS
    ========================================================= */

    const loginPanel =
        document.getElementById(
            "loginPanel"
        );


    const adminDashboard =
        document.getElementById(
            "adminDashboard"
        );


    const loginForm =
        document.getElementById(
            "adminLoginForm"
        );


    const loginButton =
        document.getElementById(
            "adminLoginButton"
        );


    const loginMessage =
        document.getElementById(
            "adminLoginMessage"
        );


    /* =========================================================
       CHECK ADMIN SESSION
    ========================================================= */

    checkAdminSession();


    async function checkAdminSession() {

        try {

            const response =
                await fetch(
                    "/api/admin/session",
                    {
                        credentials:
                            "same-origin"
                    }
                );


            const data =
                await response.json();


            if (
                data.authenticated === true
            ) {

                showDashboard();

            }

            else {

                showLogin();

            }

        }

        catch (error) {

            console.error(
                "Session check error:",
                error
            );

            showLogin();

        }

    }


    /* =========================================================
       SHOW LOGIN
    ========================================================= */

    function showLogin() {

        if (loginPanel) {

            loginPanel.style.display =
                "flex";

        }


        if (adminDashboard) {

            adminDashboard.style.display =
                "none";

        }

    }


    /* =========================================================
       SHOW DASHBOARD
    ========================================================= */

    function showDashboard() {

        if (loginPanel) {

            loginPanel.style.display =
                "none";

        }


        if (adminDashboard) {

            adminDashboard.style.display =
                "flex";

        }


        loadAll();

    }


    /* =========================================================
       ADMIN LOGIN
    ========================================================= */

    loginForm?.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const password =
                document
                    .getElementById(
                        "adminPassword"
                    )
                    ?.value;


            if (!password) {

                if (loginMessage) {

                    loginMessage.textContent =
                        "Please enter your password.";

                }

                return;

            }


            if (loginButton) {

                loginButton.disabled =
                    true;

                loginButton.innerHTML =
                    "Signing in...";

            }


            if (loginMessage) {

                loginMessage.textContent =
                    "";

            }


            try {

                const response =
                    await fetch(
                        "/api/admin/login",
                        {

                            method:
                                "POST",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            credentials:
                                "same-origin",

                            body:
                                JSON.stringify({
                                    password
                                })

                        }
                    );


                const data =
                    await response.json();


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Login failed."
                    );

                }


                if (loginMessage) {

                    loginMessage.style.color =
                        "#286b52";

                    loginMessage.textContent =
                        "Login successful.";

                }


                setTimeout(
                    showDashboard,
                    300
                );

            }

            catch (error) {

                console.error(
                    "Admin login:",
                    error
                );


                if (loginMessage) {

                    loginMessage.style.color =
                        "#a13f50";

                    loginMessage.textContent =
                        error.message;

                }

            }

            finally {

                if (loginButton) {

                    loginButton.disabled =
                        false;

                    loginButton.innerHTML =
                        "Enter Admin Dashboard <span>→</span>";

                }

            }

        }
    );


    /* =========================================================
       LOAD EVERYTHING
    ========================================================= */

    async function loadAll() {

        /*
            Use allSettled instead of Promise.all.

            This is important because if one dashboard
            section fails, testimonials will still load.
        */

        await Promise.allSettled([

            loadResources(),

            loadFeedback(),

            loadTestimonials()

        ]);

    }


    /* =========================================================
       LOGOUT
    ========================================================= */

    async function logout() {

        try {

            await fetch(
                "/api/admin/logout",
                {

                    method:
                        "POST",

                    credentials:
                        "same-origin"

                }
            );

        }

        catch (error) {

            console.error(
                "Logout error:",
                error
            );

        }


        showLogin();


        const passwordField =
            document.getElementById(
                "adminPassword"
            );


        if (passwordField) {

            passwordField.value =
                "";

        }

    }


    document
        .getElementById(
            "adminLogout"
        )
        ?.addEventListener(
            "click",
            logout
        );


    document
        .getElementById(
            "mobileLogout"
        )
        ?.addEventListener(
            "click",
            logout
        );


    /* =========================================================
       RESOURCE TYPE CONTROLS
    ========================================================= */

    const resourceType =
        document.getElementById(
            "resourceType"
        );


    const fileGroup =
        document.getElementById(
            "fileGroup"
        );


    const urlGroup =
        document.getElementById(
            "urlGroup"
        );


    const resourceFile =
        document.getElementById(
            "resourceFile"
        );


    const fileIcon =
        document.getElementById(
            "fileIcon"
        );


    const fileTitle =
        document.getElementById(
            "fileTitle"
        );


    const fileDescription =
        document.getElementById(
            "fileDescription"
        );


    const fileHelp =
        document.getElementById(
            "fileHelp"
        );


    function updateResourceType() {

        if (!resourceType) {

            return;

        }


        const type =
            resourceType.value;


        /* =====================================================
           EXTERNAL LINK
        ===================================================== */

        if (
            type === "link"
        ) {

            if (fileGroup) {

                fileGroup.style.display =
                    "none";

            }


            if (urlGroup) {

                urlGroup.style.display =
                    "block";

            }


            if (resourceFile) {

                resourceFile.value =
                    "";

            }


            return;

        }


        /* =====================================================
           FILE RESOURCE
        ===================================================== */

        if (fileGroup) {

            fileGroup.style.display =
                "block";

        }


        if (urlGroup) {

            urlGroup.style.display =
                "none";

        }


        if (resourceFile) {

            resourceFile.value =
                "";

        }


        if (
            type === "pdf"
        ) {

            if (fileIcon) {

                fileIcon.textContent =
                    "📕";

            }


            if (fileTitle) {

                fileTitle.textContent =
                    "Choose a PDF";

            }


            if (fileDescription) {

                fileDescription.textContent =
                    "PDF files only";

            }


            if (fileHelp) {

                fileHelp.textContent =
                    "Upload the PDF customers should read.";

            }


            if (resourceFile) {

                resourceFile.accept =
                    ".pdf,application/pdf";

            }

        }


        else if (
            type === "image"
        ) {

            if (fileIcon) {

                fileIcon.textContent =
                    "🖼️";

            }


            if (fileTitle) {

                fileTitle.textContent =
                    "Choose an image";

            }


            if (fileDescription) {

                fileDescription.textContent =
                    "JPG, PNG, WEBP or GIF";

            }


            if (fileHelp) {

                fileHelp.textContent =
                    "Upload an image customers should see.";

            }


            if (resourceFile) {

                resourceFile.accept =
                    "image/jpeg,image/png,image/webp,image/gif";

            }

        }


        else if (
            type === "video"
        ) {

            if (fileIcon) {

                fileIcon.textContent =
                    "🎥";

            }


            if (fileTitle) {

                fileTitle.textContent =
                    "Choose a video";

            }


            if (fileDescription) {

                fileDescription.textContent =
                    "MP4, WEBM or MOV";

            }


            if (fileHelp) {

                fileHelp.textContent =
                    "Upload a video customers should watch.";

            }


            if (resourceFile) {

                resourceFile.accept =
                    "video/mp4,video/webm,video/quicktime";

            }

        }

    }


    resourceType?.addEventListener(
        "change",
        updateResourceType
    );


    updateResourceType();


    /* =========================================================
       SHOW SELECTED FILE
    ========================================================= */

    resourceFile?.addEventListener(
        "change",
        () => {

            const file =
                resourceFile.files[0];


            if (!file) {

                updateResourceType();

                return;

            }


            if (fileTitle) {

                fileTitle.textContent =
                    file.name;

            }


            if (fileDescription) {

                fileDescription.textContent =
                    `${(
                        file.size /
                        (1024 * 1024)
                    ).toFixed(2)} MB`;

            }

        }
    );


    /* =========================================================
       RESOURCE FORM
    ========================================================= */

    document
        .getElementById(
            "resourceForm"
        )
        ?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const title =
                    document
                        .getElementById(
                            "resourceTitle"
                        )
                        ?.value
                        .trim();


                const type =
                    resourceType?.value;


                const file =
                    resourceFile
                        ?.files[0];


                const url =
                    document
                        .getElementById(
                            "resourceUrl"
                        )
                        ?.value
                        .trim();


                const message =
                    document
                        .getElementById(
                            "resourceMessage"
                        );


                const button =
                    document
                        .getElementById(
                            "resourceButton"
                        );


                if (message) {

                    message.textContent =
                        "";

                }


                if (!title) {

                    if (message) {

                        message.textContent =
                            "Please enter a resource title.";

                    }

                    return;

                }


                if (
                    type === "pdf" &&
                    !file
                ) {

                    if (message) {

                        message.textContent =
                            "Please select a PDF file.";

                    }

                    return;

                }


                if (
                    type === "image" &&
                    !file
                ) {

                    if (message) {

                        message.textContent =
                            "Please select an image.";

                    }

                    return;

                }


                if (
                    type === "video" &&
                    !file
                ) {

                    if (message) {

                        message.textContent =
                            "Please select a video.";

                    }

                    return;

                }


                if (
                    type === "link" &&
                    !url
                ) {

                    if (message) {

                        message.textContent =
                            "Please enter the external link.";

                    }

                    return;

                }


                const formData =
                    new FormData();


                formData.append(
                    "title",
                    title
                );


                formData.append(
                    "type",
                    type
                );


                if (
                    type === "link"
                ) {

                    formData.append(
                        "url",
                        url
                    );

                }

                else {

                    formData.append(
                        "file",
                        file
                    );

                }


                if (button) {

                    button.disabled =
                        true;

                    button.innerHTML =
                        "Adding resource...";

                }


                try {

                    const response =
                        await fetch(
                            "/api/admin/resources",
                            {

                                method:
                                    "POST",

                                credentials:
                                    "same-origin",

                                body:
                                    formData

                            }
                        );


                    const data =
                        await response.json();


                    if (
                        !response.ok ||
                        !data.success
                    ) {

                        throw new Error(
                            data.message ||
                            "Unable to add resource."
                        );

                    }


                    if (message) {

                        message.style.color =
                            "#286b52";

                        message.textContent =
                            "Resource added successfully.";

                    }


                    document
                        .getElementById(
                            "resourceForm"
                        )
                        ?.reset();


                    updateResourceType();


                    await loadResources();

                }

                catch (error) {

                    console.error(
                        "Resource:",
                        error
                    );


                    if (message) {

                        message.style.color =
                            "#a13f50";

                        message.textContent =
                            error.message;

                    }

                }

                finally {

                    if (button) {

                        button.disabled =
                            false;

                        button.innerHTML =
                            "Add Resource <span>→</span>";

                    }

                }

            }
        );


    /* =========================================================
       LOAD RESOURCES
    ========================================================= */

    async function loadResources() {

        try {

            const response =
                await fetch(
                    "/api/admin/resources",
                    {
                        credentials:
                            "same-origin"
                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "Unable to load resources."
                );

            }


            const resources =
                data.resources || [];


            const count =
                document.getElementById(
                    "resourceCount"
                );


            if (count) {

                count.textContent =
                    resources.length;

            }


            /*
                Some versions of the admin HTML may not
                contain resourceList.

                In that case, simply stop here.
                This must NEVER stop testimonials.
            */

            const list =
                document.getElementById(
                    "resourceList"
                );


            if (!list) {

                return;

            }


            if (!resources.length) {

                list.innerHTML = `
                    <div class="empty-state">
                        No resources uploaded yet.
                    </div>
                `;

                return;

            }


            list.innerHTML =
                resources
                    .map(
                        resource => {

                            const title =
                                escapeHtml(
                                    resource.title
                                );


                            const type =
                                escapeHtml(
                                    resource.type
                                );


                            const fileName =
                                escapeHtml(
                                    resource.original_name ||
                                    ""
                                );


                            return `

                                <div class="resource-admin-item">

                                    <div>

                                        <strong>
                                            ${title}
                                        </strong>

                                        <p>
                                            ${type.toUpperCase()}

                                            ${
                                                fileName
                                                    ? ` • ${fileName}`
                                                    : ""
                                            }
                                        </p>

                                    </div>


                                    <div class="item-actions">

                                        ${
                                            resource.type ===
                                                "link" &&
                                            resource.url
                                                ? `
                                                    <a
                                                        class="small-button"
                                                        href="${escapeHtml(resource.url)}"
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                    >
                                                        Open
                                                    </a>
                                                `
                                                : resource.original_name
                                                    ? `
                                                        <a
                                                            class="small-button"
                                                            href="/api/admin/resources/${resource.id}/file"
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                        >
                                                            View
                                                        </a>
                                                    `
                                                    : ""
                                        }


                                        <button
                                            class="small-button reject-button"
                                            data-resource-delete="${resource.id}"
                                        >
                                            Remove
                                        </button>

                                    </div>

                                </div>

                            `;

                        }
                    )
                    .join("");


            list
                .querySelectorAll(
                    "[data-resource-delete]"
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            "click",
                            () => {

                                deleteResource(
                                    button.dataset
                                        .resourceDelete
                                );

                            }
                        );

                    }
                );

        }

        catch (error) {

            console.error(
                "Resources:",
                error
            );

        }

    }


    /* =========================================================
       DELETE RESOURCE
    ========================================================= */

    async function deleteResource(
        id
    ) {

        if (
            !confirm(
                "Remove this resource?"
            )
        ) {

            return;

        }


        try {

            const response =
                await fetch(
                    `/api/admin/resources/${id}`,
                    {

                        method:
                            "DELETE",

                        credentials:
                            "same-origin"

                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "Unable to remove resource."
                );

            }


            await loadResources();

        }

        catch (error) {

            console.error(
                "Delete resource:",
                error
            );


            alert(
                error.message
            );

        }

    }


    /* =========================================================
       LOAD FEEDBACK
    ========================================================= */

    async function loadFeedback() {

        try {

            const response =
                await fetch(
                    "/api/admin/feedback",
                    {
                        credentials:
                            "same-origin"
                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "Unable to load feedback."
                );

            }


            const feedback =
                data.feedback || [];


            const count =
                document.getElementById(
                    "feedbackCount"
                );


            if (count) {

                count.textContent =
                    feedback.length;

            }


            const list =
                document.getElementById(
                    "feedbackList"
                );


            if (!list) {

                return;

            }


            if (!feedback.length) {

                list.innerHTML = `
                    <div class="empty-state">
                        No customer feedback yet.
                    </div>
                `;

                return;

            }


            list.innerHTML =
                feedback
                    .map(
                        item => `

                            <div class="feedback-item">

                                <strong>
                                    ${escapeHtml(
                                        item.customer_name ||
                                        "Customer"
                                    )}
                                </strong>


                                ${
                                    item.email
                                        ? `
                                            <small>
                                                ${escapeHtml(
                                                    item.email
                                                )}
                                            </small>
                                        `
                                        : ""
                                }


                                <div class="stars">

                                    ${"★".repeat(
                                        Math.max(
                                            0,
                                            Math.min(
                                                5,
                                                Number(
                                                    item.rating
                                                )
                                            )
                                        )
                                    )}

                                    ${"☆".repeat(
                                        Math.max(
                                            0,
                                            5 -
                                            Math.min(
                                                5,
                                                Number(
                                                    item.rating
                                                )
                                            )
                                        )
                                    )}

                                </div>


                                <p>
                                    ${escapeHtml(
                                        item.message
                                    )}
                                </p>

                            </div>

                        `
                    )
                    .join("");

        }

        catch (error) {

            console.error(
                "Feedback:",
                error
            );

        }

    }


    /* =========================================================
       LOAD TESTIMONIALS
    ========================================================= */

    async function loadTestimonials() {

        try {

            const response =
                await fetch(
                    "/api/admin/testimonials",
                    {

                        credentials:
                            "same-origin",

                        cache:
                            "no-store"

                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "Unable to load testimonials."
                );

            }


            const testimonials =
                Array.isArray(
                    data.testimonials
                )
                    ? data.testimonials
                    : [];


            const testimonialCount =
                document.getElementById(
                    "testimonialCount"
                );


            if (testimonialCount) {

                testimonialCount.textContent =
                    testimonials.length;

            }


            const approvedCount =
                testimonials.filter(
                    item =>
                        item.approved === true
                ).length;


            const approvedCountElement =
                document.getElementById(
                    "approvedCount"
                );


            if (
                approvedCountElement
            ) {

                approvedCountElement.textContent =
                    approvedCount;

            }


            const pendingCount =
                testimonials.filter(
                    item =>
                        item.approved !== true
                ).length;


            const pendingCountElement =
                document.getElementById(
                    "pendingCount"
                );


            if (
                pendingCountElement
            ) {

                pendingCountElement.textContent =
                    pendingCount;

            }


            const list =
                document.getElementById(
                    "testimonialList"
                );


            if (!list) {

                console.warn(
                    "testimonialList element was not found in admin HTML."
                );

                return;

            }


            if (!testimonials.length) {

                list.innerHTML = `
                    <div class="empty-state">
                        No testimonials submitted yet.
                    </div>
                `;

                return;

            }


            list.innerHTML =
                testimonials
                    .map(
                        testimonial => {

                            const approved =
                                testimonial.approved ===
                                true;


                            const permission =
                                testimonial.permission ===
                                true;


                            const rating =
                                Math.max(
                                    0,
                                    Math.min(
                                        5,
                                        Number(
                                            testimonial.rating
                                        )
                                    )
                                );


                            /*
                                Photo comes from the server as:

                                /api/testimonials/ID/photo

                                for testimonials with an uploaded
                                customer photo.
                            */

                            const photoHtml =
                                testimonial.image
                                    ? `

                                        <div
                                            class="testimonial-admin-photo"
                                            style="
                                                margin-bottom:15px;
                                            "
                                        >

                                            <img
                                                src="${escapeHtml(
                                                    testimonial.image
                                                )}"
                                                alt="${escapeHtml(
                                                    testimonial.name ||
                                                    "Customer"
                                                )}"
                                                loading="lazy"
                                                style="
                                                    width:80px;
                                                    height:80px;
                                                    border-radius:50%;
                                                    object-fit:cover;
                                                    display:block;
                                                    border:2px solid rgba(0,0,0,.08);
                                                "
                                                onerror="this.style.display='none';"
                                            >

                                        </div>

                                    `
                                    : `

                                        <div
                                            class="testimonial-admin-photo"
                                            style="
                                                margin-bottom:15px;
                                            "
                                        >

                                            <div
                                                style="
                                                    width:80px;
                                                    height:80px;
                                                    border-radius:50%;
                                                    display:flex;
                                                    align-items:center;
                                                    justify-content:center;
                                                    background:#f1f1f1;
                                                    font-size:30px;
                                                "
                                            >
                                                👤
                                            </div>

                                        </div>

                                    `;


                            const customerEmail =
                                testimonial.customer_email ||
                                testimonial.email ||
                                "";


                            return `

                                <article
                                    class="testimonial-admin-item"
                                    data-testimonial-id="${testimonial.id}"
                                >

                                    ${photoHtml}


                                    <div class="testimonial-top">

                                        <div>

                                            <h4>
                                                ${escapeHtml(
                                                    testimonial.name ||
                                                    "Customer"
                                                )}
                                            </h4>


                                            ${
                                                testimonial.location
                                                    ? `
                                                        <p>
                                                            ${escapeHtml(
                                                                testimonial.location
                                                            )}
                                                        </p>
                                                    `
                                                    : ""
                                            }


                                            ${
                                                customerEmail
                                                    ? `
                                                        <small
                                                            style="
                                                                display:block;
                                                                margin-bottom:8px;
                                                            "
                                                        >
                                                            ${escapeHtml(
                                                                customerEmail
                                                            )}
                                                        </small>
                                                    `
                                                    : ""
                                            }


                                            <div class="stars">

                                                ${"★".repeat(
                                                    rating
                                                )}

                                                ${"☆".repeat(
                                                    5 - rating
                                                )}

                                            </div>

                                        </div>


                                        <span
                                            class="status ${
                                                approved
                                                    ? "approved"
                                                    : "pending"
                                            }"
                                        >

                                            ${
                                                approved
                                                    ? "APPROVED"
                                                    : "PENDING"
                                            }

                                        </span>

                                    </div>


                                    <p class="testimonial-message">

                                        "${escapeHtml(
                                            testimonial.message ||
                                            ""
                                        )}"

                                    </p>


                                    <div class="permission">

                                        ${
                                            permission
                                                ? `
                                                    <span>
                                                        ✓ Customer gave permission to publish
                                                    </span>
                                                `
                                                : `
                                                    <span>
                                                        ⚠ Customer did not give publishing permission
                                                    </span>
                                                `
                                        }

                                    </div>


                                    ${
                                        testimonial.photo_filename
                                            ? `
                                                <div
                                                    style="
                                                        margin-top:8px;
                                                        font-size:12px;
                                                        opacity:.7;
                                                    "
                                                >
                                                    Customer photo attached
                                                </div>
                                            `
                                            : `
                                                <div
                                                    style="
                                                        margin-top:8px;
                                                        font-size:12px;
                                                        opacity:.7;
                                                    "
                                                >
                                                    No customer photo
                                                </div>
                                            `
                                    }


                                    <div class="item-actions">

                                        ${
                                            !approved
                                                ? `

                                                    <button
                                                        class="small-button approve-button"
                                                        data-approve="${testimonial.id}"
                                                    >
                                                        ✓ Approve
                                                    </button>

                                                `
                                                : `

                                                    <button
                                                        class="small-button reject-button"
                                                        data-reject="${testimonial.id}"
                                                    >
                                                        Remove Approval
                                                    </button>

                                                `
                                        }


                                        <button
                                            class="small-button reject-button"
                                            data-testimonial-delete="${testimonial.id}"
                                        >
                                            Delete
                                        </button>

                                    </div>


                                    ${
                                        approved &&
                                        permission
                                            ? `
                                                <div
                                                    style="
                                                        margin-top:12px;
                                                        font-size:12px;
                                                        color:#286b52;
                                                    "
                                                >
                                                    ✓ This testimonial is currently
                                                    eligible to appear on the public website.
                                                </div>
                                            `
                                            : approved &&
                                              !permission
                                                ? `
                                                    <div
                                                        style="
                                                            margin-top:12px;
                                                            font-size:12px;
                                                            color:#a13f50;
                                                        "
                                                    >
                                                        ⚠ Approved, but it will NOT appear
                                                        publicly because permission was not given.
                                                    </div>
                                                `
                                                : `
                                                    <div
                                                        style="
                                                            margin-top:12px;
                                                            font-size:12px;
                                                            opacity:.7;
                                                        "
                                                    >
                                                        Awaiting admin approval.
                                                    </div>
                                                `
                                    }

                                </article>

                            `;

                        }
                    )
                    .join("");


            /* =================================================
               APPROVE BUTTONS
            ================================================= */

            list
                .querySelectorAll(
                    "[data-approve]"
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            "click",
                            async () => {

                                const id =
                                    button.dataset
                                        .approve;


                                await updateTestimonial(
                                    id,
                                    true
                                );

                            }
                        );

                    }
                );


            /* =================================================
               REMOVE APPROVAL BUTTONS
            ================================================= */

            list
                .querySelectorAll(
                    "[data-reject]"
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            "click",
                            async () => {

                                const id =
                                    button.dataset
                                        .reject;


                                await updateTestimonial(
                                    id,
                                    false
                                );

                            }
                        );

                    }
                );


            /* =================================================
               DELETE TESTIMONIAL BUTTONS
            ================================================= */

            list
                .querySelectorAll(
                    "[data-testimonial-delete]"
                )
                .forEach(
                    button => {

                        button.addEventListener(
                            "click",
                            async () => {

                                const id =
                                    button.dataset
                                        .testimonialDelete;


                                await deleteTestimonial(
                                    id
                                );

                            }
                        );

                    }
                );

        }

        catch (error) {

            console.error(
                "Testimonials:",
                error
            );


            const list =
                document.getElementById(
                    "testimonialList"
                );


            if (list) {

                list.innerHTML = `

                    <div class="empty-state">

                        Unable to load testimonials.

                        <br>

                        <small>
                            ${escapeHtml(
                                error.message
                            )}
                        </small>

                    </div>

                `;

            }

        }

    }


    /* =========================================================
       APPROVE / REJECT TESTIMONIAL
    ========================================================= */

    async function updateTestimonial(
        id,
        approved
    ) {

        try {

            const button =
                document.querySelector(
                    `[data-approve="${id}"],
                     [data-reject="${id}"]`
                );


            if (button) {

                button.disabled =
                    true;

                button.textContent =
                    approved
                        ? "Approving..."
                        : "Removing...";

            }


            const response =
                await fetch(
                    `/api/admin/testimonials/${id}`,
                    {

                        method:
                            "PATCH",

                        credentials:
                            "same-origin",

                        headers: {

                            "Content-Type":
                                "application/json"

                        },

                        body:
                            JSON.stringify({

                                approved:
                                    approved

                            })

                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "Unable to update testimonial."
                );

            }


            await loadTestimonials();


        }

        catch (error) {

            console.error(
                "Update testimonial:",
                error
            );


            alert(
                error.message
            );


            await loadTestimonials();

        }

    }


    /* =========================================================
       DELETE TESTIMONIAL
    ========================================================= */

    async function deleteTestimonial(
        id
    ) {

        if (
            !confirm(
                "Delete this testimonial permanently?"
            )
        ) {

            return;

        }


        try {

            const response =
                await fetch(
                    `/api/admin/testimonials/${id}`,
                    {

                        method:
                            "DELETE",

                        credentials:
                            "same-origin"

                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "Unable to delete testimonial."
                );

            }


            await loadTestimonials();

        }

        catch (error) {

            console.error(
                "Delete testimonial:",
                error
            );


            alert(
                error.message
            );

        }

    }


    /* =========================================================
       HTML ESCAPE
    ========================================================= */

    function escapeHtml(
        value
    ) {

        return String(
            value ?? ""
        )

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

    }


});