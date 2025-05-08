console.log("About Us page loaded!");

// Sidebar
document.addEventListener("DOMContentLoaded", function () {
    const sidebar = document.querySelector(".sidebar");
    const toggleBtn = document.querySelector(".toggle-btn");
    const plusIcon = document.querySelector(".plus-icon");

    toggleBtn.addEventListener("click", function () {
        sidebar.classList.toggle("open");

        if (sidebar.classList.contains("open")) {
            plusIcon.style.display = "none";
        } else {
            plusIcon.style.display = "block";
        }
    });
});