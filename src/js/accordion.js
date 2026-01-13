export class Accordion {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;
        this.init();
    }

    init() {
        const items = this.container.querySelectorAll('.accordion__item');

        items.forEach(itemEl => {
            const header = itemEl.querySelector('.accordion__header');
            const content = itemEl.querySelector('.accordion__content');

            if (!header || !content) return;

            header.addEventListener('click', () => {
                const isOpen = itemEl.classList.contains('active');

                if (isOpen) {
                    // Close user's open item
                    itemEl.classList.remove('active');
                    content.style.maxHeight = null;
                    this.container.classList.remove('has-focus');
                } else {
                    // OPENING A NEW ITEM

                    // 1. Close any currently open item (if any exists)
                    this.container.querySelectorAll('.accordion__item').forEach(el => {
                        el.classList.remove('active');
                        el.querySelector('.accordion__content').style.maxHeight = null;
                    });

                    // 2. Open the clicked item
                    itemEl.classList.add('active');
                    content.style.maxHeight = content.scrollHeight + "px";

                    // 3. Enable Focus Mode (hides others via CSS)
                    this.container.classList.add('has-focus');
                }
            });
        });
    }
}
