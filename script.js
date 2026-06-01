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

    // Horizontal Scroll for Team Section (Desktop only)
    const teamScrollContainer = document.getElementById('team-scroll-container');
    const teamHorizontalTrack = document.querySelector('.team-horizontal-track');
    const stickyOffset = -180; // negative offset to let the title scroll off-screen before horizontal translation starts
    
    if (teamScrollContainer && teamHorizontalTrack) {
        const setContainerHeight = () => {
            if (window.innerWidth <= 992) {
                teamScrollContainer.style.height = '';
                return;
            }
            const trackWidth = teamHorizontalTrack.scrollWidth;
            const maxTranslate = trackWidth - window.innerWidth;
            if (maxTranslate > 0) {
                teamScrollContainer.style.height = `${maxTranslate + window.innerHeight - stickyOffset}px`;
            } else {
                teamScrollContainer.style.height = '';
            }
        };
        
        const handleScroll = () => {
            if (window.innerWidth <= 992) {
                teamHorizontalTrack.style.transform = '';
                return;
            }
            
            const trackWidth = teamHorizontalTrack.scrollWidth;
            const maxTranslate = trackWidth - window.innerWidth;
            if (maxTranslate <= 0) return;
            
            const rect = teamScrollContainer.getBoundingClientRect();
            const scrollProgress = stickyOffset - rect.top;
            const maxProgress = teamScrollContainer.offsetHeight - window.innerHeight + stickyOffset;
            
            if (scrollProgress >= 0 && scrollProgress <= maxProgress) {
                teamHorizontalTrack.style.transform = `translateX(-${scrollProgress}px)`;
            } else if (scrollProgress < 0) {
                teamHorizontalTrack.style.transform = 'translateX(0px)';
            } else if (scrollProgress > maxProgress) {
                teamHorizontalTrack.style.transform = `translateX(-${maxTranslate}px)`;
            }
        };
        
        window.addEventListener('load', () => {
            setContainerHeight();
            handleScroll();
        });
        window.addEventListener('scroll', handleScroll);
        window.addEventListener('resize', () => {
            setContainerHeight();
            handleScroll();
        });
        
        // Initial setup
        setContainerHeight();
        handleScroll();
    }
});

