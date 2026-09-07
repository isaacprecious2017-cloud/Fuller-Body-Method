document.addEventListener("DOMContentLoaded", () => {

    /* ================================
       MOBILE NAVIGATION
    ================================= */

    const menuToggle = document.querySelector(".menu-toggle");
    const navLinks = document.querySelector(".nav-links");

    if (menuToggle && navLinks) {
        menuToggle.addEventListener("click", () => {
            navLinks.classList.toggle("active");
            menuToggle.classList.toggle("active");
        });

        navLinks.querySelectorAll("a").forEach(link => {
            link.addEventListener("click", () => {
                navLinks.classList.remove("active");
                menuToggle.classList.remove("active");
            });
        });
    }


    /* ================================
       SMOOTH SCROLLING
    ================================= */

    document.querySelectorAll('a[href^="#"]').forEach(link => {

        link.addEventListener("click", function (event) {

            const targetId = this.getAttribute("href");

            if (!targetId || targetId === "#") {
                return;
            }

            const target = document.querySelector(targetId);

            if (target) {
                event.preventDefault();

                target.scrollIntoView({
                    behavior: "smooth",
                    block: "start"
                });
            }

        });

    });


    /* ================================
       BUY BUTTON
    ================================= */

    const buyButton = document.getElementById("buyButton");

    if (buyButton) {

        buyButton.addEventListener("click", () => {

            const checkoutMessage =
                "Hello, I would like to purchase The Fuller-Body Method for ₦9,800.";

            const whatsappNumber = "2347015196414";

            const whatsappURL =
                `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(checkoutMessage)}`;

            window.open(whatsappURL, "_blank");

        });

    }


    /* ================================
       NAVBAR SCROLL EFFECT
    ================================= */

    const header = document.querySelector(".site-header");

    if (header) {

        window.addEventListener("scroll", () => {

            if (window.scrollY > 40) {
                header.classList.add("scrolled");
            } else {
                header.classList.remove("scrolled");
            }

        });

    }

    /* =====================================================
   FULLER-BODY TESTIMONIAL SYSTEM
   REAL CUSTOMER TESTIMONIALS + STATIC SAMPLE TESTIMONIALS
===================================================== */


/* =====================================================
   ORIGINAL / INITIAL TESTIMONIALS

   These act as a fallback so the slider is never empty
   before you have real approved testimonials. They now
   show AFTER the real ones, not before.
===================================================== */

const initialTestimonials = [

    {
        name: "Blessing",
        location: "Abuja",
        rating: 5,

        message:
            "The meal structure made everything feel much easier. I finally had a simple plan instead of wondering what to eat every day.",

        image:
            "images/testimonials/customer-1.png"
    },


    {
        name: "Daminola",
        location: "Lagos",
        rating: 5,

        message:
            "I liked that the guide focused on foods I already know and can actually find in the local market.",

        image:
            "images/testimonials/customer-2.png"
    },


    {
        name: "Chioma",
        location: "Port Harcourt",
        rating: 5,

        message:
            "The 30-day calendar gave me the structure I had been missing. It made planning my meals much less stressful.",

        image:
            "images/testimonials/customer-3.png"
    },


    {
        name: "Aisha",
        location: "Abuja",
        rating: 5,

        message:
            "I especially appreciated the ingredient guide. Shopping became much easier because I knew exactly what I was looking for.",

        image:
            "images/testimonials/customer-4.png"
    }

];


/* =====================================================
   APPROVED CUSTOMER TESTIMONIALS
===================================================== */

let approvedTestimonials = [];


/* =====================================================
   COMBINED TESTIMONIALS
===================================================== */

let publicTestimonials = [];


/* =====================================================
   SLIDER STATE
===================================================== */

let currentTestimonial = 0;

let testimonialTimer = null;


/* =====================================================
   LOAD APPROVED TESTIMONIALS

   FIX 1: fetch now uses cache: "no-store" and a
   cache-busting query param, so a newly approved
   testimonial is never masked by a stale cached
   response (browser cache or an in-between CDN).

   FIX 2: real approved testimonials are now placed
   FIRST in the list, ahead of the four sample ones.
   Previously they were appended at the END, so a
   freshly approved testimonial was technically loading
   correctly but sitting 5th in line behind the sample
   testimonials — easy to miss and look like "nothing
   happened".
===================================================== */

async function loadPublicTestimonials() {

    const stage =
        document.getElementById(
            "testimonialStage"
        );


    const dots =
        document.getElementById(
            "testimonialDots"
        );


    if (!stage) {

        return;

    }


    try {

        const response =
            await fetch(
                `/api/testimonials?t=${Date.now()}`,
                {
                    cache:
                        "no-store"
                }
            );


        if (
            response.ok
        ) {

            const data =
                await response.json();


            approvedTestimonials =
                Array.isArray(
                    data.testimonials
                )
                    ? data.testimonials
                    : [];

        }

    }

    catch (error) {

        /*
         * This is intentionally not fatal.
         *
         * The original four testimonials will
         * still display if the API is unavailable.
         */

        console.warn(
            "Could not load customer testimonials.",
            error
        );


        approvedTestimonials = [];

    }


    /*
     * IMPORTANT:
     *
     * Real, approved customer testimonials FIRST.
     * Sample testimonials fill in after them.
     */

    publicTestimonials = [

        ...approvedTestimonials,

        ...initialTestimonials

    ];


    if (
        publicTestimonials.length === 0
    ) {

        stage.innerHTML = `

            <div class="testimonial-empty">

                Customer experiences will
                appear here soon.

            </div>

        `;

        if (dots) {

            dots.innerHTML = "";

        }

        return;

    }


    renderTestimonials();

    createTestimonialDots();

    currentTestimonial = 0;

    showTestimonial(0);

    startTestimonialRotation();

}


/* =====================================================
   RENDER TESTIMONIALS
===================================================== */

function renderTestimonials() {

    const stage =
        document.getElementById(
            "testimonialStage"
        );


    if (!stage) {

        return;

    }


    stage.innerHTML =
        publicTestimonials
            .map(
                (
                    testimonial,
                    index
                ) => {


                    const rating =
                        Math.min(
                            5,
                            Math.max(
                                1,
                                Number(
                                    testimonial.rating || 5
                                )
                            )
                        );


                    const stars =
                        "★".repeat(
                            rating
                        );


                    const image =
                        testimonial.image ||
                        "images/default-avatar.png";


                    const name =
                        testimonial.name ||
                        "Fuller-Body Member";


                    const location =
                        testimonial.location ||
                        "Member";


                    const message =
                        testimonial.message ||
                        "";


                    return `

                        <article
                            class="testimonial-slide"
                            data-index="${index}"
                        >

                            <div
                                class="testimonial-photo"
                            >

                                <img
                                    src="${escapeHTML(image)}"
                                    alt="${escapeHTML(name)}"
                                    onerror="
                                        this.onerror=null;
                                        this.src='images/default-avatar.png';
                                    "
                                >

                            </div>


                            <div
                                class="testimonial-content"
                            >

                                <div
                                    class="testimonial-stars"
                                >

                                    ${stars}

                                </div>


                                <blockquote
                                    class="testimonial-quote"
                                >

                                    ${escapeHTML(message)}

                                </blockquote>


                                <div
                                    class="testimonial-person"
                                >

                                    <span
                                        class="testimonial-person-line"
                                    ></span>


                                    <div>

                                        <strong>

                                            ${escapeHTML(name)}

                                        </strong>


                                        <span>

                                            ${escapeHTML(location)}

                                        </span>

                                    </div>

                                </div>

                            </div>

                        </article>

                    `;

                }
            )
            .join("");

}


/* =====================================================
   SHOW TESTIMONIAL
===================================================== */

function showTestimonial(index) {

    const slides =
        document.querySelectorAll(
            ".testimonial-slide"
        );


    if (
        !slides.length
    ) {

        return;

    }


    if (
        index < 0
    ) {

        index =
            slides.length - 1;

    }


    if (
        index >= slides.length
    ) {

        index = 0;

    }


    slides.forEach(
        slide => {

            slide.classList.remove(
                "active"
            );

            slide.classList.remove(
                "leaving"
            );

        }
    );


    currentTestimonial =
        index;


    slides[
        currentTestimonial
    ].classList.add(
        "active"
    );


    updateTestimonialDots();

}


/* =====================================================
   CREATE DOTS
===================================================== */

function createTestimonialDots() {

    const dots =
        document.getElementById(
            "testimonialDots"
        );


    if (!dots) {

        return;

    }


    dots.innerHTML =
        publicTestimonials
            .map(
                (
                    testimonial,
                    index
                ) => `

                    <button
                        class="testimonial-dot"
                        type="button"
                        data-index="${index}"
                        aria-label="Show testimonial ${index + 1}"
                    ></button>

                `
            )
            .join("");


    dots
        .querySelectorAll(
            ".testimonial-dot"
        )
        .forEach(
            dot => {

                dot.addEventListener(
                    "click",
                    () => {

                        const index =
                            Number(
                                dot.dataset.index
                            );


                        showTestimonial(
                            index
                        );


                        restartTestimonialRotation();

                    }
                );

            }
        );

}


/* =====================================================
   UPDATE DOTS
===================================================== */

function updateTestimonialDots() {

    const dots =
        document.querySelectorAll(
            ".testimonial-dot"
        );


    dots.forEach(
        (
            dot,
            index
        ) => {

            dot.classList.toggle(
                "active",
                index === currentTestimonial
            );

        }
    );

}


/* =====================================================
   NEXT
===================================================== */

function nextTestimonial() {

    if (
        publicTestimonials.length <= 1
    ) {

        return;

    }


    const next =
        (
            currentTestimonial + 1
        ) %
        publicTestimonials.length;


    showTestimonial(
        next
    );

}


/* =====================================================
   PREVIOUS
===================================================== */

function previousTestimonial() {

    if (
        publicTestimonials.length <= 1
    ) {

        return;

    }


    const previous =
        (
            currentTestimonial -
            1 +
            publicTestimonials.length
        ) %
        publicTestimonials.length;


    showTestimonial(
        previous
    );

}


/* =====================================================
   AUTOMATIC ROTATION
===================================================== */

function startTestimonialRotation() {

    stopTestimonialRotation();


    if (
        publicTestimonials.length <= 1
    ) {

        return;

    }


    testimonialTimer =
        setInterval(
            () => {

                nextTestimonial();

            },
            5500
        );

}


/* =====================================================
   STOP ROTATION
===================================================== */

function stopTestimonialRotation() {

    if (
        testimonialTimer
    ) {

        clearInterval(
            testimonialTimer
        );

        testimonialTimer = null;

    }

}


/* =====================================================
   RESTART ROTATION
===================================================== */

function restartTestimonialRotation() {

    startTestimonialRotation();

}


/* =====================================================
   SAFE HTML
===================================================== */

function escapeHTML(value) {

    return String(
        value ?? ""
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


/* =====================================================
   START EVERYTHING

   FIX: this used to be wrapped in its own
   document.addEventListener("DOMContentLoaded", ...).
   That's the actual bug that was keeping the slider
   stuck on "Loading customer experiences..." forever —
   this whole block already lives INSIDE the outer
   DOMContentLoaded handler at the top of this file, so
   by the time execution reached this point, the
   DOMContentLoaded event had already fired. A listener
   registered for an event AFTER that event has already
   happened will never run. loadPublicTestimonials() was
   therefore never being called at all, on any browser,
   with or without caching involved.

   The fix is simply to run this code directly instead
   of registering a second, redundant listener for it.
===================================================== */

loadPublicTestimonials();


const testimonialNextButton =
    document.getElementById(
        "testimonialNext"
    );


const testimonialPrevButton =
    document.getElementById(
        "testimonialPrev"
    );


if (testimonialNextButton) {

    testimonialNextButton.addEventListener(
        "click",
        () => {

            nextTestimonial();

            restartTestimonialRotation();

        }
    );

}


if (testimonialPrevButton) {

    testimonialPrevButton.addEventListener(
        "click",
        () => {

            previousTestimonial();

            restartTestimonialRotation();

        }
    );

}


const testimonialStageEl =
    document.getElementById(
        "testimonialStage"
    );


if (testimonialStageEl) {

    testimonialStageEl.addEventListener(
        "mouseenter",
        () => {

            stopTestimonialRotation();

        }
    );


    testimonialStageEl.addEventListener(
        "mouseleave",
        () => {

            startTestimonialRotation();

        }
    );

}


   /* ========================================
   FAQ ACCORDION
======================================== */

const faqItems = document.querySelectorAll(".faq-item");

faqItems.forEach((item) => {

    const question = item.querySelector(".faq-question");

    question.addEventListener("click", () => {

        const isOpen =
            item.classList.contains("active");

        faqItems.forEach((otherItem) => {

            if (otherItem !== item) {

                otherItem.classList.remove("active");

                const otherQuestion =
                    otherItem.querySelector(".faq-question");

                if (otherQuestion) {
                    otherQuestion.setAttribute(
                        "aria-expanded",
                        "false"
                    );
                }

            }

        });

        item.classList.toggle(
            "active",
            !isOpen
        );


        question.setAttribute(
            "aria-expanded",
            String(!isOpen)
        );

    });

});


    /* ================================
       REVEAL ANIMATION
    ================================= */

    const revealElements =
        document.querySelectorAll(
            ".tried-card, .inside-card, .product-grid, .grandmother-grid, .offer-box"
        );

    if ("IntersectionObserver" in window) {

        const observer = new IntersectionObserver(
            (entries, observer) => {

                entries.forEach(entry => {

                    if (entry.isIntersecting) {

                        entry.target.classList.add("revealed");

                        observer.unobserve(entry.target);

                    }

                });

            },
            {
                threshold: 0.12
            }
        );

        revealElements.forEach(element => {
            element.classList.add("reveal");
            observer.observe(element);
        });

    } else {

        revealElements.forEach(element => {
            element.classList.add("revealed");
        });

    }


    /* ================================
       CURRENT YEAR
    ================================= */

    const yearElement =
        document.querySelector(".current-year");

    if (yearElement) {
        yearElement.textContent =
            new Date().getFullYear();
    }


    /* ================================
       IMAGE ERROR HANDLING
    ================================= */

    const images = document.querySelectorAll("img");

    images.forEach(image => {

        image.addEventListener("error", () => {

            console.warn(
                `Image could not be loaded: ${image.src}`
            );

        });

    });


    /* ================================
       ESCAPE KEY
       CLOSE MOBILE MENU / FAQ
    ================================= */

    document.addEventListener("keydown", event => {

        if (event.key !== "Escape") {
            return;
        }

        if (navLinks) {
            navLinks.classList.remove("active");
        }

        if (menuToggle) {
            menuToggle.classList.remove("active");
        }

        faqItems.forEach(item => {
            item.classList.remove("active");
        });

    });

});
