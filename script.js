document.addEventListener('DOMContentLoaded', () => {
    const menuToggle = document.getElementById('menu-toggle');
    const menuClose = document.getElementById('menu-close');
    const navOverlay = document.getElementById('nav-overlay');
    const menuLinks = document.querySelectorAll('.overlay-menu a');

    // Open menu
    menuToggle.addEventListener('click', () => {
        navOverlay.classList.add('active');
    });

    // Close menu function
    const closeMenu = () => {
        navOverlay.classList.remove('active');
    };

    // Close menu when clicking the close button
    menuClose.addEventListener('click', closeMenu);

    // Close menu when clicking any link inside the nav
    menuLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // 3D Bookshelf Interactions
    const books = document.querySelectorAll('.book-container');
    
    books.forEach(book => {
        book.addEventListener('click', (e) => {
            // Only open if not already open
            if (!book.classList.contains('open')) {
                // Close all books first (safety)
                books.forEach(b => b.classList.remove('open'));
                
                const container = document.querySelector('.bookshelf-container');
                book.classList.add('open');
                container.classList.add('active');
            }
            
            // Prevent event from bubbling up
            e.stopPropagation();
        });
    });

    // Close button logic
    const closeBtn = document.querySelector('.close-book-btn');
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            books.forEach(b => {
                b.classList.remove('open');
                const flippableSheet = b.querySelector('.flippable-sheet');
                if (flippableSheet) flippableSheet.classList.remove('flipped');
            });
            const container = document.querySelector('.bookshelf-container');
            if (container) container.classList.remove('active');
        });
    }

});

