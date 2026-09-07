document.addEventListener(
    "DOMContentLoaded",
    () => {

        const form =
            document.getElementById(
                "resetForm"
            );


        const message =
            document.getElementById(
                "resetMessage"
            );


        const params =
            new URLSearchParams(
                window.location.search
            );


        const token =
            params.get("token");


        if (!token) {

            message.style.color =
                "#a13f50";

            message.textContent =
                "This reset link is invalid or incomplete. Please request a new one.";


            if (form) {

                form.style.display =
                    "none";

            }

        }


        form?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const password =
                    document.getElementById(
                        "password"
                    ).value;


                const confirmPassword =
                    document.getElementById(
                        "confirmPassword"
                    ).value;


                if (
                    password.length < 6
                ) {

                    message.style.color =
                        "#a13f50";

                    message.textContent =
                        "Your password must be at least 6 characters.";

                    return;

                }


                if (
                    password !== confirmPassword
                ) {

                    message.style.color =
                        "#a13f50";

                    message.textContent =
                        "The passwords do not match.";

                    return;

                }


                const button =
                    form.querySelector(
                        "button"
                    );


                button.disabled =
                    true;

                button.textContent =
                    "Updating...";

                message.textContent =
                    "";


                try {

                    const response =
                        await fetch(
                            "/api/customer/reset-password",
                            {

                                method:
                                    "POST",

                                headers: {

                                    "Content-Type":
                                        "application/json"

                                },

                                body:
                                    JSON.stringify({

                                        token,

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
                            "Unable to reset your password."
                        );

                    }


                    message.style.color =
                        "#286b52";

                    message.textContent =
                        "Your password has been updated. Redirecting to login...";


                    setTimeout(
                        () => {

                            window.location.href =
                                "/login.html";

                        },
                        1800
                    );

                }

                catch (error) {

                    message.style.color =
                        "#a13f50";

                    message.textContent =
                        error.message;


                    button.disabled =
                        false;

                    button.textContent =
                        "Update Password";

                }

            }
        );

    }
);
