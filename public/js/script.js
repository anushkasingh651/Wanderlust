// ==========================================
// WANDERLUST - CLIENT SIDE JAVASCRIPT
// ==========================================

document.addEventListener("DOMContentLoaded", () => {

    // ------------------------------------------
    // Auto-hide Bootstrap flash messages
    // ------------------------------------------

    const alerts = document.querySelectorAll(".alert");

    alerts.forEach((alert) => {

        setTimeout(() => {

            if (typeof bootstrap !== "undefined") {

                const bsAlert =
                    bootstrap.Alert.getOrCreateInstance(alert);

                bsAlert.close();

            } else {

                alert.style.opacity = "0";

                setTimeout(() => {
                    alert.remove();
                }, 300);

            }

        }, 4000);

    });


    // ------------------------------------------
    // Confirm delete actions
    // ------------------------------------------

    const deleteForms =
        document.querySelectorAll(".delete-form");

    deleteForms.forEach((form) => {

        form.addEventListener("submit", (event) => {

            const confirmed = confirm(
                "Are you sure you want to delete this?"
            );

            if (!confirmed) {
                event.preventDefault();
            }

        });

    });


    // ------------------------------------------
    // Rating selector
    // ------------------------------------------

    const ratingSelect =
        document.querySelector("#rating");

    if (ratingSelect) {

        ratingSelect.addEventListener("change", () => {

            const ratingValue =
                ratingSelect.value;

            const ratingText =
                document.querySelector("#ratingText");

            if (ratingText) {

                if (ratingValue) {

                    ratingText.textContent =
                        `${ratingValue} / 5`;

                } else {

                    ratingText.textContent =
                        "Select a rating";

                }

            }

        });

    }


    // ------------------------------------------
    // Image preview for listing form
    // ------------------------------------------

    const imageInput =
        document.querySelector("#imageUrl");

    const imagePreview =
        document.querySelector("#imagePreview");

    if (imageInput && imagePreview) {

        imageInput.addEventListener("input", () => {

            const url =
                imageInput.value.trim();

            if (url) {

                imagePreview.src = url;

                imagePreview.style.display =
                    "block";

            } else {

                imagePreview.style.display =
                    "none";

            }

        });

    }


    // ------------------------------------------
    // Smooth scroll
    // ------------------------------------------

    document.querySelectorAll(
        'a[href^="#"]'
    ).forEach((link) => {

        link.addEventListener("click", (event) => {

            const targetId =
                link.getAttribute("href");

            if (
                targetId &&
                targetId !== "#"
            ) {

                const target =
                    document.querySelector(targetId);

                if (target) {

                    event.preventDefault();

                    target.scrollIntoView({
                        behavior: "smooth",
                        block: "start"
                    });

                }

            }

        });

    });


    // ------------------------------------------
    // Prevent double form submission
    // ------------------------------------------

    document.querySelectorAll("form").forEach((form) => {

        form.addEventListener("submit", () => {

            const submitButton =
                form.querySelector(
                    'button[type="submit"], input[type="submit"]'
                );

            if (submitButton) {

                setTimeout(() => {

                    submitButton.disabled = true;

                }, 10);

            }

        });

    });

});

