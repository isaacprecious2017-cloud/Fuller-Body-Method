document.addEventListener(
    "DOMContentLoaded",
    () => {

        const loginForm =
            document.getElementById(
                "loginForm"
            );


        loginForm?.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const email =
                    document.getElementById(
                        "email"
                    ).value;


                const password =
                    document.getElementById(
                        "password"
                    ).value;


                const message =
                    document.getElementById(
                        "loginMessage"
                    );


                try {

                    const response =
                        await fetch(
                            "/api/customer/login",
                            {

                                method:
                                    "POST",

                                headers: {

                                    "Content-Type":
                                        "application/json"

                                },

                                body:
                                    JSON.stringify({

                                        email,

                                        password

                                    })

                            }
                        );


                    const data =
                        await response.json();


                    if (!data.success) {

                        throw new Error(
                            data.message
                        );

                    }


                    window.location.href =
                        data.redirect;

                }

                catch (error) {

                    message.textContent =
                        error.message;

                }

            }
        );

    }
);
