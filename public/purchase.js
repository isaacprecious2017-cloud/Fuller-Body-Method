document.addEventListener(
    "DOMContentLoaded",
    () => {

        const paymentForm =
            document.getElementById(
                "paymentForm"
            );

        const payButton =
            document.getElementById(
                "payButton"
            );


        if (paymentForm) {

            paymentForm.addEventListener(

                "submit",

                async (event) => {

                    event.preventDefault();


                    const customerName =
                        document
                            .getElementById(
                                "customerName"
                            )
                            .value
                            .trim();


                    const customerEmail =
                        document
                            .getElementById(
                                "customerEmail"
                            )
                            .value
                            .trim();


                    if (
                        !customerName ||
                        !customerEmail
                    ) {

                        alert(
                            "Please complete your name and email."
                        );

                        return;

                    }


                    const originalButtonText =
                        payButton.textContent;


                    try {

                        payButton.disabled =
                            true;


                        payButton.textContent =
                            "Preparing secure payment...";


                        const response =
                            await fetch(

                                "/api/payments/initialize",

                                {

                                    method:
                                        "POST",

                                    headers: {

                                        "Content-Type":
                                            "application/json"

                                    },

                                    body:

                                        JSON.stringify({

                                            name:
                                                customerName,

                                            email:
                                                customerEmail

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

                                "Unable to initialize payment."

                            );

                        }


                        /*
                           Redirect customer
                           to secure Paystack checkout
                        */

                        window.location.href =
                            data.authorization_url;

                    }

                    catch (error) {

                        console.error(
                            error
                        );


                        alert(
                            error.message ||
                            "Something went wrong. Please try again."
                        );


                        payButton.disabled =
                            false;


                        payButton.textContent =
                            originalButtonText;

                    }

                }

            );

        }


        /* ================================
           ERROR MESSAGE AFTER CALLBACK
        ================================= */

        const urlParams =
            new URLSearchParams(
                window.location.search
            );

        const error =
            urlParams.get("error");


        if (error) {

            let message =
                "Your payment could not be completed.";

            if (
                error === "verification_failed"
            ) {

                message =
                    "We could not verify your payment. Please contact support if you were charged.";

            }


            alert(message);

        }

    }
);