document.addEventListener(
    "DOMContentLoaded",
    async () => {

        const params =
            new URLSearchParams(
                window.location.search
            );


        const id =
            params.get("id");


        const content =
            document.getElementById(
                "readerContent"
            );


        const loading =
            document.getElementById(
                "readerLoading"
            );


        const title =
            document.getElementById(
                "readerTitle"
            );


        const errorBox =
            document.getElementById(
                "readerError"
            );


        function showError(message) {

            loading.style.display =
                "none";

            errorBox.style.display =
                "flex";

            errorBox.textContent =
                message;

        }


        if (!id) {

            showError(
                "No resource was selected."
            );

            return;

        }


        try {

            /*
                FIX: this used to call /api/library, which
                only ever returns rows from the old "pdfs"
                table. Resources added through the admin
                "Add a new resource" form (pdf, image, video
                or link) live in the "resources" table and
                are exposed through /api/customer/resources.
            */

            const response =
                await fetch(
                    "/api/customer/resources",
                    {
                        credentials:
                            "same-origin"
                    }
                );


            if (!response.ok) {

                window.location.href =
                    "/login.html";

                return;

            }


            const data =
                await response.json();


            if (!data.success) {

                throw new Error(
                    data.message ||
                    "Unable to load your library."
                );

            }


            const resource =
                (data.resources || []).find(
                    item =>
                        String(item.id) ===
                        String(id)
                );


            if (!resource) {

                throw new Error(
                    "Resource not found."
                );

            }


            title.textContent =
                resource.title ||
                "Untitled Resource";


            const type =
                (resource.type || "pdf").toLowerCase();


            /* =========================================
               EXTERNAL LINK
               There is nothing to render here — send
               the member straight to the resource.
            ========================================= */

            if (type === "link") {

                if (resource.url) {

                    window.location.href =
                        resource.url;

                    return;

                }


                throw new Error(
                    "This link is missing a URL."
                );

            }


            /* =========================================
               GUARD: missing file

               If this resource is type pdf/image/video but
               has no file_url, its file never made it onto
               the server (upload failed, or it was added
               without a file some other way). Rather than
               injecting "null" into an iframe/img/video src
               — which is what produced "Cannot GET /null" —
               show a clear, actionable message instead.
            ========================================= */

            const fileUrl =
                resource.file_url ||
                (
                    type === "pdf" ||
                    type === "image" ||
                    type === "video"
                )
                    ? `/api/customer/resources/${encodeURIComponent(resource.id)}/file`
                    : null;


            if (
                !fileUrl &&
                (
                    type === "pdf" ||
                    type === "image" ||
                    type === "video"
                )
            ) {

                throw new Error(
                    "This resource does not have a file attached."
                );

            }


            /* =========================================
               PDF
            ========================================= */

            if (type === "pdf") {

                const iframe =
                    document.createElement(
                        "iframe"
                    );


                iframe.id =
                    "pdfViewer";

                iframe.title =
                    "Private PDF Reader";

                iframe.className =
                    "pdf-viewer";

                iframe.src =
                    `${fileUrl}#toolbar=0&navpanes=0&scrollbar=1`;


                iframe.addEventListener(
                    "load",
                    () => {

                        loading.style.display =
                            "none";

                    }
                );


                content.appendChild(
                    iframe
                );


                setTimeout(
                    () => {

                        loading.style.display =
                            "none";

                    },
                    2500
                );


                setupCopyProtection();

                return;

            }


            /* =========================================
               IMAGE
            ========================================= */

            if (type === "image") {

                const img =
                    document.createElement(
                        "img"
                    );


                img.className =
                    "reader-image";

                img.alt =
                    resource.title ||
                    "Private resource";

                img.src =
                    fileUrl;


                img.addEventListener(
                    "load",
                    () => {

                        loading.style.display =
                            "none";

                    }
                );


                img.addEventListener(
                    "error",
                    () => {

                        showError(
                            "Unable to load this image."
                        );

                    }
                );


                content.appendChild(
                    img
                );


                setupCopyProtection();

                return;

            }


            /* =========================================
               VIDEO
            ========================================= */

            if (type === "video") {

                const video =
                    document.createElement(
                        "video"
                    );


                video.className =
                    "reader-video";

                video.src =
                    fileUrl;

                video.controls =
                    true;

                video.controlsList =
                    "nodownload";


                video.addEventListener(
                    "loadeddata",
                    () => {

                        loading.style.display =
                            "none";

                    }
                );


                video.addEventListener(
                    "error",
                    () => {

                        showError(
                            "Unable to load this video."
                        );

                    }
                );


                content.appendChild(
                    video
                );


                setTimeout(
                    () => {

                        loading.style.display =
                            "none";

                    },
                    2500
                );


                return;

            }


            throw new Error(
                "Unsupported resource type."
            );

        }

        catch (error) {

            showError(
                error.message
            );

        }


        function setupCopyProtection() {

            document.addEventListener(
                "contextmenu",
                event => {

                    event.preventDefault();

                }
            );


            document.addEventListener(
                "keydown",
                event => {

                    if (
                        event.ctrlKey &&
                        (
                            event.key === "s" ||
                            event.key === "p" ||
                            event.key === "u"
                        )
                    ) {

                        event.preventDefault();

                    }

                }
            );

        }

    }
);
