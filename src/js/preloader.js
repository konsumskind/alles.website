/**
 * Handles the preloader initialization and removal.
 */
export const initPreloader = () => {
    window.addEventListener('load', () => {
        const preloader = document.getElementById('preloader');
        if (preloader) {
            // Minimum display time to prevent flickering on fast loads
            setTimeout(() => {
                preloader.classList.add('hidden');
                // Remove from DOM after transition to clean up
                setTimeout(() => {
                    preloader.remove();
                }, 600); // Match transition duration
            }, 500);
        }
    });
};
