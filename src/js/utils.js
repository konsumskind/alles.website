import logoSrc from '../assets/logo_light.svg';

export const showToast = (message) => {
    const toast = document.getElementById('toast');
    if (!toast) return;

    let toastTimeout;

    // Inject Logo + Message
    toast.innerHTML = `
        <img src="${logoSrc}" alt="" class="toast__icon">
        <span>${message}</span>
    `;

    toast.classList.add('show');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000); // Slightly longer duration to read and see logo
};

/**
 * Responsive check for mobile/compact layout
 * Matches the logic previously handled by SCSS media queries
 * @returns {boolean}
 */
export const isDesktopDevice = () => {
    // Current project breakpoint for "Desktop" layout is 768x768
    return window.matchMedia("(pointer: coarse) and (hover: none)").matches;
};
