document.addEventListener(
    "DOMContentLoaded",
    () => {

        const form =
            document.getElementById(
                "forgotForm"
            );


        const message =
            document.getElementById(
                "forgotMessage"
            );


        form?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const email =
                    document.getElementById(
                        "email"
                    ).value.trim();


                const button =
                    form.querySelector(
                        "button"
                    );


                button.disabled =
                    true;

                button.textContent =
                    "Sending...";

                message.style.color =
                    "#7a3155";

                message.textContent =
                    "";


                try {

                    const response =
                        await fetch(
                            "/api/customer/forgot-password",
                            {

                                method:
                                    "POST",

                                headers: {

                                    "Content-Type":
                                        "application/json"

                                },

                                body:
                                    JSON.stringify({
                                        email
                                    })

                            }
                        );


                    const data =
                        await response.json();


                    /*
                        We always show a generic success
                        message, even if the email wasn't
                        found. This avoids letting someone
                        use this form to check which emails
                        have accounts.
                    */

                    message.style.color =
                        "#286b52";

                    message.textContent =
                        data.message ||
                        "If that email has an account, a reset link is on its way.";


                    form.reset();

                }

                catch (error) {

                    message.style.color =
                        "#a13f50";

                    message.textContent =
                        "Something went wrong. Please try again.";

                }

                finally {

                    button.disabled =
                        false;

                    button.textContent =
                        "Send Reset Link";

                }

            }
        );

    }
);
