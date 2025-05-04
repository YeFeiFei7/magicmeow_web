document.addEventListener("DOMContentLoaded", function () {
    const imageMap = {
      "calendar-icon": "calendar-image",
      "task-icon": "task-image",
      "focus-icon": "focus-image",
      "stats-icon": "stats-image"
    };

    const allImages = document.querySelectorAll(".feature-img");

    Object.keys(imageMap).forEach(iconId => {
      const icon = document.getElementById(iconId);
      icon.addEventListener("click", () => {
        allImages.forEach(img => {
          img.classList.remove("visible");
        });

        const targetId = imageMap[iconId];
        const targetImage = document.getElementById(targetId);
        if (targetImage) {
          targetImage.classList.add("visible");
        }
      });
    });

    // Smooth scrolling for nav links
    document.querySelectorAll('.nav-btn').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });
});