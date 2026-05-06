
import { showToast } from './utils.js';

export const initContactForm = () => {
    const contactBtn = document.getElementById('contactSubmitBtn');
    if (contactBtn) {
        contactBtn.addEventListener('click', sendMail);
    }

    const bookingBtn = document.getElementById('contactBookingBtn');
    if (bookingBtn) {
        bookingBtn.addEventListener('click', () => {
            document.dispatchEvent(new CustomEvent('openBookingForm'));
        });
    }
};

export const sendMail = () => {
    const nameInput = document.getElementById('contactName');
    const subjectInput = document.getElementById('contactSubject');

    if (!nameInput || !subjectInput) return;

    const name = nameInput.value;
    const subject = subjectInput.value;

    if (!name || !subject) {
        showToast('Bitte Name & Thema ausfüllen.');
        return;
    }

    const body = `Hallo Janosch,%0D%0A%0D%0AIch bin ${name} und möchte mich bezüglich "${subject}" melden.%0D%0A%0D%0AViele Grüße`;
    window.location.href = `mailto:janoschkartschall@gmail.com?subject=Anfrage: ${subject}&body=${body}`;
};
