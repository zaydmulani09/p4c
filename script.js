document.addEventListener('DOMContentLoaded', () => {
    // Initialize Lenis Smooth Scroll
    const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        orientation: 'vertical',
        gestureOrientation: 'vertical',
        smoothWheel: true,
        wheelMultiplier: 1,
        touchMultiplier: 2,
        infinite: false,
    });

    function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Keep scroll listeners active with Lenis scroll
    lenis.on('scroll', () => {
        // Dispatch window scroll event to ensure all scroll-dependent parallax and horizontal scroll layouts update correctly
        window.dispatchEvent(new Event('scroll'));
    });

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

    // Close menu and smooth scroll when clicking overlay menu links
    menuLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            closeMenu();
            const targetId = link.getAttribute('href');
            if (targetId && targetId.startsWith('#')) {
                e.preventDefault();
                const targetEl = document.querySelector(targetId);
                if (targetEl) {
                    setTimeout(() => {
                        lenis.scrollTo(targetEl);
                    }, 300);
                }
            }
        });
    });

    // Smooth scroll for all other anchor links (like hero buttons)
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        if (anchor.closest('.overlay-menu')) return;

        anchor.addEventListener('click', (e) => {
            const targetId = anchor.getAttribute('href');
            if (targetId === '#') return;
            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                e.preventDefault();
                lenis.scrollTo(targetEl);
            }
        });
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

    // Donation Card Component Logic
    const donButtons = document.querySelectorAll('.don-btn');
    const donInput = document.querySelector('.don-input');
    const donSubmit = document.querySelector('.don-submit');
    const donBackBtn = document.querySelector('.don-back-btn');
    const donFormState = document.getElementById('donation-form-state');
    const donSoonState = document.getElementById('donation-soon-state');

    if (donButtons.length > 0 && donInput && donSubmit && donFormState && donSoonState) {
        // Toggle preset buttons active class
        donButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                donButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                donInput.value = ''; // clear custom amount input
            });
        });

        // Typing custom amount clears preset active classes
        donInput.addEventListener('input', () => {
            if (donInput.value.trim() !== '') {
                donButtons.forEach(b => b.classList.remove('active'));
            }
        });

        // Submit transition to Coming Soon state
        donSubmit.addEventListener('click', () => {
            donFormState.classList.add('hidden');
            donSoonState.classList.remove('hidden');
        });

        // Back transition to Form state
        if (donBackBtn) {
            donBackBtn.addEventListener('click', () => {
                donSoonState.classList.add('hidden');
                donFormState.classList.remove('hidden');
            });
        }
    }
});

