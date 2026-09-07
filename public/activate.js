document.addEventListener(
    "DOMContentLoaded",
    () => {


        const form =
            document.getElementById(
                "activateForm"
            );


        const password =
            document.getElementById(
                "activatePassword"
            );


        const confirmPassword =
            document.getElementById(
                "confirmPassword"
            );


        const message =
            document.getElementById(
                "activateMessage"
            );


        const button =
            document.getElementById(
                "activateButton"
            );


        const strengthBar =
            document.getElementById(
                "strengthBar"
            );


        const passwordHint =
            document.getElementById(
                "passwordHint"
            );



        /* =========================================
           CHECK CURRENT CUSTOMER
        ========================================= */

        loadPurchaseEmail();



        /* =========================================
           SHOW PASSWORD
        ========================================= */

        document
            .getElementById(
                "togglePassword"
            )
            .addEventListener(
                "click",
                () => {

                    togglePassword(
                        password,
                        document.getElementById(
                            "togglePassword"
                        )
                    );

                }
            );



        document
            .getElementById(
                "toggleConfirmPassword"
            )
            .addEventListener(
                "click",
                () => {

                    togglePassword(
                        confirmPassword,
                        document.getElementById(
                            "toggleConfirmPassword"
                        )
                    );

                }
            );



        /* =========================================
           PASSWORD STRENGTH
        ========================================= */

        password.addEventListener(
            "input",
            () => {

                updatePasswordStrength(
                    password.value,
                    strengthBar,
                    passwordHint
                );

            }
        );



        /* =========================================
           SUBMIT
        ========================================= */

        form.addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const name =
                    document.getElementById(
                        "activateName"
                    ).value.trim();


                const email =
                    document.getElementById(
                        "activateEmail"
                    ).value.trim();


                const passwordValue =
                    password.value;


                const confirmValue =
                    confirmPassword.value;


                const agree =
                    document.getElementById(
                        "agreeTerms"
                    ).checked;



                message.textContent =
                    "";



                /* VALIDATION */

                if (
                    passwordValue.length < 6
                ) {

                    message.textContent =
                        "Your password must be at least 6 characters.";

                    return;

                }


                if (
                    passwordValue !==
                    confirmValue
                ) {

                    message.textContent =
                        "The passwords do not match.";

                    return;

                }


                if (!agree) {

                    message.textContent =
                        "Please confirm the account terms.";

                    return;

                }



                button.disabled =
                    true;


                button.innerHTML =
                    `
                    Creating your account...
                    `;



                try {

                    const response =
                        await fetch(
                            "/api/customer/activate",
                            {

                                method:
                                    "POST",

                                headers: {

                                    "Content-Type":
                                        "application/json"

                                },

                                body:
                                    JSON.stringify({

                                        name,

                                        email,

                                        password:
                                            passwordValue

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
                            "Unable to activate your account."
                        );

                    }



                    message.style.color =
                        "#5b2948";

                    message.textContent =
                        "Account created successfully. Opening your private library...";



                    setTimeout(
                        () => {

                            window.location.href =
                                "/dashboard.html";

                        },
                        900
                    );

                }


                catch (error) {

                    message.style.color =
                        "#7a3155";

                    message.textContent =
                        error.message;


                    button.disabled =
                        false;


                    button.innerHTML =
                        `
                        Create My Account
                        <span>→</span>
                        `;

                }

            }
        );

    }
);


/* =====================================================
   LOAD PURCHASE EMAIL
===================================================== */

async function loadPurchaseEmail() {

    try {

        const response =
            await fetch(
                "/api/customer/me"
            );


        const data =
            await response.json();


        if (
            response.ok &&
            data.success
        ) {

            const emailInput =
                document.getElementById(
                    "activateEmail"
                );


            emailInput.value =
                data.customer.email;


            emailInput.readOnly =
                true;


            document
                .getElementById(
                    "activateName"
                )
                .value =
                data.customer.name || "";

        }

    }

    catch {

        /*

        The user can still enter
        their purchase email manually.

        */

    }

}


/* =====================================================
   TOGGLE PASSWORD
===================================================== */

function togglePassword(
    input,
    button
) {

    if (
        input.type ===
        "password"
    ) {

        input.type =
            "text";

        button.textContent =
            "Hide";

    }

    else {

        input.type =
            "password";

        button.textContent =
            "Show";

    }

}


/* =====================================================
   PASSWORD STRENGTH
===================================================== */

function updatePasswordStrength(
    value,
    bar,
    hint
) {

    let score =
        0;


    if (
        value.length >= 6
    ) score++;


    if (
        value.length >= 10
    ) score++;


    if (
        /[A-Z]/.test(value)
    ) score++;


    if (
        /[0-9]/.test(value)
    ) score++;


    if (
        /[^A-Za-z0-9]/.test(value)
    ) score++;



    const widths = [

        "0%",

        "20%",

        "40%",

        "60%",

        "80%",

        "100%"

    ];


    bar.style.width =
        widths[score];



    if (!value) {

        hint.textContent =
            "Use at least 6 characters.";

        return;

    }


    if (score <= 2) {

        hint.textContent =
            "Password strength: weak.";

    }

    else if (score <= 3) {

        hint.textContent =
            "Password strength: fair.";

    }

    else {

        hint.textContent =
            "Password strength: strong.";

    }

}