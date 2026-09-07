document.addEventListener(
    "DOMContentLoaded",
    async () => {


        /* =========================================
           ELEMENTS
        ========================================= */

        const sidebar =
            document.getElementById(
                "sidebar"
            );

        const overlay =
            document.getElementById(
                "sidebarOverlay"
            );

        const mobileMenu =
            document.getElementById(
                "mobileMenuButton"
            );

        const customerName =
            document.getElementById(
                "sidebarName"
            );

        const welcomeName =
            document.getElementById(
                "welcomeName"
            );

        const memberInitial =
            document.getElementById(
                "memberInitial"
            );

        const topbarInitial =
            document.getElementById(
                "topbarInitial"
            );



        /* =========================================
           MOBILE MENU
        ========================================= */

        function closeMobileMenu() {

            sidebar?.classList.remove(
                "open"
            );

            overlay?.classList.remove(
                "active"
            );

        }


        mobileMenu?.addEventListener(
            "click",
            () => {

                sidebar.classList.toggle(
                    "open"
                );

                overlay.classList.toggle(
                    "active"
                );

            }
        );


        overlay?.addEventListener(
            "click",
            closeMobileMenu
        );


        document
            .querySelectorAll(
                ".menu-link"
            )
            .forEach(
                link => {

                    link.addEventListener(
                        "click",
                        closeMobileMenu
                    );

                }
            );



        /* =========================================
           LOAD CUSTOMER
        ========================================= */

        try {

            const response =
                await fetch(
                    "/api/customer/me",
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

                window.location.href =
                    "/login.html";

                return;

            }


            const name =
                data.customer.name ||
                "Member";


            const firstName =
                name
                    .trim()
                    .split(" ")[0];


            const initial =
                firstName
                    .charAt(0)
                    .toUpperCase();


            customerName.textContent =
                name;


            welcomeName.textContent =
                firstName;


            memberInitial.textContent =
                initial;


            topbarInitial.textContent =
                initial;


        }

        catch (error) {

            console.error(
                error
            );


            window.location.href =
                "/login.html";

            return;

        }



        /* =========================================
           LOAD LIBRARY
        ========================================= */

        await loadLibrary();



        /* =========================================
           COMMUNITY
        ========================================= */

        await loadCommunity();



        /* =========================================
           FEEDBACK
        ========================================= */

        setupRating();

        setupFeedback();



        /* =========================================
           TESTIMONIAL
        ========================================= */

        setupTestimonial();



        /* =========================================
           LOGOUT
        ========================================= */

        document
            .getElementById(
                "logoutButton"
            )
            ?.addEventListener(
                "click",
                async () => {

                    try {

                        await fetch(
                            "/api/customer/logout",
                            {
                                method:
                                    "POST",

                                credentials:
                                    "same-origin"
                            }
                        );

                    }

                    finally {

                        window.location.href =
                            "/login.html";

                    }

                }
            );



        /* =========================================
           YEAR
        ========================================= */

        const year =
            document.getElementById(
                "currentYear"
            );


        if (year) {

            year.textContent =
                new Date()
                    .getFullYear();

        }


    }
);



/* =====================================================
   LIBRARY

   IMPORTANT FIX:

   This used to call /api/library, which only reads
   the OLD "pdfs" table. Anything the admin adds through
   "Add a new resource" (PDF, image, video or link) is
   saved into the "resources" table instead, via
   /api/admin/resources.

   That mismatch is why uploaded resources never showed
   up here. We now call /api/customer/resources, which
   already reads from the correct table.
===================================================== */

async function loadLibrary() {

    const grid =
        document.getElementById(
            "libraryGrid"
        );


    const count =
        document.getElementById(
            "resourceCount"
        );


    try {

        const response =
            await fetch(
                "/api/customer/resources",
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
            data.resources ||
            [];


        if (count) {

            count.textContent =
                resources.length;

        }


        if (!resources.length) {

            grid.innerHTML = `

                <div class="loading-card">

                    <div
                        class="library-icon"
                        style="margin:0 auto 10px;"
                    >
                        ▣
                    </div>

                    <p>
                        Your resources will appear here
                        when they are added.
                    </p>

                </div>

            `;

            return;

        }


        grid.innerHTML =
            resources
                .map(
                    resource =>
                        createResourceCard(
                            resource
                        )
                )
                .join("");


    }

    catch (error) {

        console.error(
            "Library error:",
            error
        );


        grid.innerHTML = `

            <div class="loading-card">

                <p>
                    Unable to load your library.
                    Please refresh the page.
                </p>

            </div>

        `;

    }

}



/* =====================================================
   RESOURCE CARD

   "resource" now comes from /api/customer/resources,
   which returns: id, title, type, url (for links),
   file_url (for pdf/image/video), original_name, etc.
===================================================== */

function createResourceCard(
    resource
) {

    const type =
        (
            resource.type ||
            "pdf"
        ).toLowerCase();


    let icon =
        "📖";

    let label =
        "Resource";


    let action =
        "Open →";


    let href =
        "#";


    let openInNewTab =
        false;


    /*
        GUARD: a pdf/image/video resource with no file_url
        has no file on the server (upload failed, or it was
        added some other way without one). Rather than
        linking to a reader page that will error out with
        "Cannot GET /null", show it as unavailable so
        members aren't sent to a broken page.
    */

    const isFileType =
        type === "pdf" ||
        type === "image" ||
        type === "video";


    const fileUrl =
        resource.file_url ||
        (isFileType && resource.id
            ? `/api/customer/resources/${encodeURIComponent(resource.id)}/file`
            : null);


    const missingFile =
        isFileType &&
        !fileUrl;


    if (missingFile) {

        return `

            <article class="library-card">

                <span class="library-type">
                    ${escapeHTML(label)}
                </span>


                <div class="library-icon">
                    ⚠️
                </div>


                <h3>
                    ${escapeHTML(
                        resource.title ||
                        "Untitled Resource"
                    )}
                </h3>


                <p>
                    This resource isn't available yet.
                    Please check back soon.
                </p>


                <span
                    class="read-button"
                    style="opacity:.55;cursor:not-allowed;pointer-events:none;"
                >
                    Unavailable
                </span>

            </article>

        `;

    }


    if (type === "pdf") {

        icon =
            "📕";

        label =
            "PDF Guide";

        action =
            "Read Guide →";

        href =
            `/reader.html?id=${encodeURIComponent(resource.id)}`;

    }


    else if (type === "image") {

        icon =
            "🖼️";

        label =
            "Image";

        action =
            "View Image →";

        href =
            `/reader.html?id=${encodeURIComponent(resource.id)}`;

    }


    else if (type === "video") {

        icon =
            "🎥";

        label =
            "Video";

        action =
            "Watch Video →";

        href =
            `/reader.html?id=${encodeURIComponent(resource.id)}`;

    }


    else if (type === "link") {

        icon =
            "🔗";

        label =
            "External Link";

        action =
            "Open Resource →";

        href =
            resource.url ||
            "#";

        openInNewTab =
            true;

    }


    return `

        <article class="library-card">

            <span class="library-type">
                ${escapeHTML(label)}
            </span>


            <div class="library-icon">
                ${icon}
            </div>


            <h3>
                ${escapeHTML(
                    resource.title ||
                    "Untitled Resource"
                )}
            </h3>


            <p>
                Private member access.
                Open this resource from your dashboard.
            </p>


            <a
                href="${escapeAttribute(href)}"
                class="read-button"
                ${openInNewTab
                    ? 'target="_blank" rel="noopener"'
                    : ""
                }
            >

                ${action}

            </a>

        </article>

    `;

}



/* =====================================================
   COMMUNITY

   FIX: this used to call /api/community, which does not
   exist on the server (only /api/telegram does), so this
   silently failed every time. Now it calls the real
   endpoint and reads "url" instead of "group".
===================================================== */

async function loadCommunity() {

    try {

        const response =
            await fetch(
                "/api/telegram",
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

            return;

        }


        const group =
            document.getElementById(
                "telegramGroup"
            );


        if (
            group &&
            data.url
        ) {

            group.href =
                data.url;

        }

    }

    catch (error) {

        console.log(
            "Community links unavailable."
        );

    }

}



/* =====================================================
   STAR RATING
===================================================== */

function setupRating() {

    const stars =
        document.querySelectorAll(
            ".star"
        );


    const rating =
        document.getElementById(
            "rating"
        );


    const ratingText =
        document.getElementById(
            "ratingText"
        );


    const labels = {

        1:
            "1 star — We're sorry it wasn't better.",

        2:
            "2 stars — Thank you for being honest.",

        3:
            "3 stars — Thank you for your feedback.",

        4:
            "4 stars — We're glad you enjoyed it.",

        5:
            "5 stars — We're so glad you loved it!"

    };


    stars.forEach(
        star => {

            star.addEventListener(
                "click",
                () => {

                    const value =
                        Number(
                            star.dataset.rating
                        );


                    rating.value =
                        value;


                    stars.forEach(
                        other => {

                            other.classList.toggle(
                                "selected",
                                Number(
                                    other.dataset.rating
                                ) <= value
                            );

                        }
                    );


                    if (ratingText) {

                        ratingText.textContent =
                            labels[value];

                    }

                }
            );

        }
    );

}



/* =====================================================
   FEEDBACK
===================================================== */

function setupFeedback() {

    const form =
        document.getElementById(
            "feedbackForm"
        );


    if (!form) return;


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            const rating =
                document.getElementById(
                    "rating"
                ).value;


            const message =
                document.getElementById(
                    "feedbackMessage"
                ).value.trim();


            const result =
                document.getElementById(
                    "feedbackResult"
                );


            if (!rating) {

                result.textContent =
                    "Please select a rating.";

                return;

            }


            if (!message) {

                result.textContent =
                    "Please tell us about your experience.";

                return;

            }


            const button =
                form.querySelector(
                    ".submit-button"
                );


            button.disabled =
                true;

            button.textContent =
                "Submitting...";


            try {

                const response =
                    await fetch(
                        "/api/customer/feedback",
                        {

                            method:
                                "POST",

                            credentials:
                                "same-origin",

                            headers: {

                                "Content-Type":
                                    "application/json"

                            },

                            body:
                                JSON.stringify({

                                    rating:
                                        Number(rating),

                                    message

                                })

                        }
                    );


                const data =
                    await response.json();


                result.textContent =
                    data.message ||
                    "Feedback submitted.";


                if (
                    data.success
                ) {

                    form.reset();


                    document
                        .querySelectorAll(
                            ".star"
                        )
                        .forEach(
                            star =>
                                star.classList.remove(
                                    "selected"
                                )
                        );


                    document
                        .getElementById(
                            "rating"
                        )
                        .value =
                            "";


                    document
                        .getElementById(
                            "ratingText"
                        )
                        .textContent =
                            "Thank you for your feedback.";

                }

            }

            catch (error) {

                result.textContent =
                    "Unable to submit feedback. Please try again.";

            }

            finally {

                button.disabled =
                    false;

                button.innerHTML =
                    `
                    Submit Feedback
                    <span>→</span>
                    `;

            }

        }
    );

}


/* =====================================================
   TESTIMONIAL + PHOTO UPLOAD
===================================================== */

function setupTestimonial() {

    const form =
        document.getElementById(
            "testimonialForm"
        );


    if (!form) {
        return;
    }


    const result =
        document.getElementById(
            "testimonialResult"
        );


    const nameInput =
        document.getElementById(
            "testimonialName"
        );


    const locationInput =
        document.getElementById(
            "testimonialLocation"
        );


    const ratingInput =
        document.getElementById(
            "testimonialRating"
        );


    const messageInput =
        document.getElementById(
            "testimonialMessage"
        );


    const permissionInput =
        document.getElementById(
            "testimonialPermission"
        );


    const photoInput =
        document.getElementById(
            "testimonialPhoto"
        ) ||
        form.querySelector(
            'input[type="file"]'
        );


    const button =
        form.querySelector(
            ".submit-button"
        );


    if (photoInput) {

        photoInput.setAttribute(
            "accept",
            "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        );


        let preview =
            document.getElementById(
                "testimonialPhotoPreview"
            );


        if (!preview) {

            preview =
                document.createElement(
                    "div"
                );


            preview.id =
                "testimonialPhotoPreview";


            preview.style.display =
                "none";


            preview.style.marginTop =
                "15px";


            preview.style.padding =
                "12px";


            preview.style.border =
                "1px solid #eadde1";


            preview.style.borderRadius =
                "12px";


            preview.innerHTML = `

                <img
                    id="testimonialPreviewImage"
                    src=""
                    alt="Selected testimonial photo"
                    style="
                        width:100px;
                        height:100px;
                        object-fit:cover;
                        border-radius:12px;
                        display:block;
                        margin-bottom:8px;
                    "
                >

                <span
                    id="testimonialPreviewName"
                    style="
                        display:block;
                        font-size:13px;
                        word-break:break-word;
                    "
                ></span>

            `;


            photoInput.insertAdjacentElement(
                "afterend",
                preview
            );

        }


        photoInput.addEventListener(
            "change",
            () => {

                const file =
                    photoInput.files?.[0];


                if (!file) {

                    clearPhotoPreview();

                    return;
                }


                const allowedTypes = [

                    "image/jpeg",

                    "image/png",

                    "image/webp"

                ];


                if (
                    !allowedTypes.includes(
                        file.type
                    )
                ) {

                    photoInput.value =
                        "";


                    clearPhotoPreview();


                    showTestimonialMessage(
                        "Please upload a JPG, PNG or WEBP image.",
                        "error"
                    );


                    return;
                }


                const maxSize =
                    5 *
                    1024 *
                    1024;


                if (
                    file.size >
                    maxSize
                ) {

                    photoInput.value =
                        "";


                    clearPhotoPreview();


                    showTestimonialMessage(
                        "Image is too large. Maximum size is 5 MB.",
                        "error"
                    );


                    return;
                }


                const previewImage =
                    document.getElementById(
                        "testimonialPreviewImage"
                    );


                const previewName =
                    document.getElementById(
                        "testimonialPreviewName"
                    );


                if (previewImage) {

                    const objectURL =
                        URL.createObjectURL(
                            file
                        );


                    previewImage.src =
                        objectURL;


                    previewImage.onload =
                        () => {

                            URL.revokeObjectURL(
                                objectURL
                            );

                        };

                }


                if (previewName) {

                    previewName.textContent =
                        `${file.name} • ${formatPhotoSize(file.size)}`;

                }


                if (preview) {

                    preview.style.display =
                        "block";

                }


                showTestimonialMessage(
                    `Photo selected: ${file.name}`,
                    "success"
                );

            }
        );

    }


    else {

        console.warn(
            "testimonialPhoto input was not found."
        );

    }


    form.addEventListener(
        "submit",
        async event => {

            event.preventDefault();


            if (
                form.dataset.submitting ===
                "true"
            ) {

                return;

            }


            const name =
                nameInput?.value
                    ?.trim() || "";


            const location =
                locationInput?.value
                    ?.trim() || "";


            const rating =
                ratingInput?.value || "";


            const message =
                messageInput?.value
                    ?.trim() || "";


            const permission =
                Boolean(
                    permissionInput?.checked
                );


            const photo =
                photoInput?.files?.[0] ||
                null;


            if (!name) {

                showTestimonialMessage(
                    "Please enter your name.",
                    "error"
                );

                nameInput?.focus();

                return;
            }


            if (!rating) {

                showTestimonialMessage(
                    "Please select a rating.",
                    "error"
                );

                return;
            }


            const numericRating =
                Number(rating);


            if (
                !Number.isInteger(
                    numericRating
                ) ||
                numericRating < 1 ||
                numericRating > 5
            ) {

                showTestimonialMessage(
                    "Rating must be between 1 and 5.",
                    "error"
                );

                return;
            }


            if (!message) {

                showTestimonialMessage(
                    "Please write your testimonial.",
                    "error"
                );

                messageInput?.focus();

                return;
            }


            /*
             * NOTE FOR THE SITE OWNER:
             *
             * Permission is required here on purpose.
             * The public website ONLY shows testimonials
             * that are BOTH approved by you AND have
             * permission checked by the customer. If a
             * testimonial isn't appearing after you
             * approve it, check whether the customer
             * actually ticked this box — the admin
             * dashboard will tell you clearly under
             * each testimonial.
             */

            if (!permission) {

                showTestimonialMessage(
                    "Please confirm permission before submitting.",
                    "error"
                );

                return;
            }


            if (photo) {

                const allowedTypes = [

                    "image/jpeg",

                    "image/png",

                    "image/webp"

                ];


                if (
                    !allowedTypes.includes(
                        photo.type
                    )
                ) {

                    showTestimonialMessage(
                        "Please upload only JPG, PNG or WEBP images.",
                        "error"
                    );

                    return;
                }


                const maxSize =
                    5 *
                    1024 *
                    1024;


                if (
                    photo.size >
                    maxSize
                ) {

                    showTestimonialMessage(
                        "Your image is too large. Maximum size is 5 MB.",
                        "error"
                    );

                    return;
                }

            }


            const formData =
                new FormData();


            formData.append(
                "name",
                name
            );


            formData.append(
                "location",
                location
            );


            formData.append(
                "rating",
                String(
                    numericRating
                )
            );


            formData.append(
                "message",
                message
            );


            formData.append(
                "permission",
                permission
                    ? "true"
                    : "false"
            );


            if (photo) {

                formData.append(
                    "photo",
                    photo,
                    photo.name
                );

            }


            form.dataset.submitting =
                "true";


            if (button) {

                button.disabled =
                    true;


                button.textContent =
                    photo
                        ? "Uploading Photo..."
                        : "Submitting...";

            }


            showTestimonialMessage(
                photo
                    ? "Uploading your photo and testimonial..."
                    : "Submitting your testimonial...",
                "info"
            );


            try {

                const response =
                    await fetch(
                        "/api/customer/testimonial",
                        {
                            method:
                                "POST",

                            credentials:
                                "same-origin",

                            body:
                                formData
                        }
                    );


                let data;


                try {

                    data =
                        await response.json();

                }

                catch {

                    data = {

                        success:
                            false,

                        message:
                            "The server returned an invalid response."

                    };

                }


                if (
                    response.status ===
                    401
                ) {

                    showTestimonialMessage(
                        "Your session has expired. Redirecting to login...",
                        "error"
                    );


                    setTimeout(
                        () => {

                            window.location.href =
                                "/login.html";

                        },
                        1500
                    );


                    return;
                }


                if (
                    response.status ===
                    413
                ) {

                    throw new Error(
                        "The image is too large. Please choose an image below 5 MB."
                    );

                }


                if (
                    !response.ok ||
                    !data.success
                ) {

                    throw new Error(
                        data.message ||
                        "Unable to submit testimonial."
                    );

                }


                showTestimonialMessage(
                    data.message ||
                    "Your testimonial has been submitted for review.",
                    "success"
                );


                form.reset();


                clearPhotoPreview();


                document
                    .querySelectorAll(
                        ".star"
                    )
                    .forEach(
                        star => {

                            star.classList.remove(
                                "selected"
                            );

                        }
                    );


                const ratingText =
                    document.getElementById(
                        "ratingText"
                    );


                if (ratingText) {

                    ratingText.textContent =
                        "Thank you for your feedback.";

                }

            }

            catch (error) {

                console.error(
                    "Testimonial submission error:",
                    error
                );


                showTestimonialMessage(
                    error.message ||
                    "Unable to submit testimonial. Please try again.",
                    "error"
                );

            }

            finally {

                form.dataset.submitting =
                    "false";


                if (button) {

                    button.disabled =
                        false;


                    button.innerHTML = `
                        Submit My Testimonial
                        <span>→</span>
                    `;

                }

            }

        }
    );


    function showTestimonialMessage(
        message,
        type
    ) {

        if (!result) {

            console.log(
                message
            );

            return;
        }


        result.textContent =
            message;


        result.dataset.status =
            type;


        result.classList.remove(
            "success",
            "error",
            "info"
        );


        result.classList.add(
            type
        );

    }


    function clearPhotoPreview() {

        if (photoInput) {

            photoInput.value =
                "";

        }


        const photoPreview =
            document.getElementById(
                "testimonialPhotoPreview"
            );


        const previewImage =
            document.getElementById(
                "testimonialPreviewImage"
            );


        const previewName =
            document.getElementById(
                "testimonialPreviewName"
            );


        if (previewImage) {

            previewImage.src =
                "";

        }


        if (previewName) {

            previewName.textContent =
                "";

        }


        if (photoPreview) {

            photoPreview.style.display =
                "none";

        }

    }


    function formatPhotoSize(
        bytes
    ) {

        if (
            bytes <
            1024 * 1024
        ) {

            return `${
                Math.max(
                    1,
                    Math.round(
                        bytes / 1024
                    )
                )
            } KB`;

        }


        return `${
            (
                bytes /
                (
                    1024 *
                    1024
                )
            ).toFixed(2)
        } MB`;

    }

}



/* =====================================================
   SECURITY
===================================================== */

function escapeHTML(
    value
) {

    return String(
        value
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


function escapeAttribute(
    value
) {

    return escapeHTML(
        value
    );

}
