document.addEventListener(
    "DOMContentLoaded",
    async () => {

        try {

            const response =
                await fetch(
                    "/api/customer/me"
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                window.location.href =
                    "/login.html";

            }

        }

        catch {

            window.location.href =
                "/login.html";

        }

    }
);