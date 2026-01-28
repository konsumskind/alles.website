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
