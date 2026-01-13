
export const showToast = (message) => {
    const toast = document.getElementById('toast');
    if (!toast) return;

    let toastTimeout;
    toast.textContent = message;
    toast.classList.add('show');

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 2000);
};
