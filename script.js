document.addEventListener('DOMContentLoaded', () => {

    // 1. Mobile Menu Toggle
    const navToggle = document.getElementById('nav-toggle');
    const navLinksContainer = document.getElementById('nav-links');
    
    if (navToggle && navLinksContainer) {
        navToggle.addEventListener('click', () => {
            navLinksContainer.classList.toggle('open');
            navToggle.classList.toggle('active');
            
            // Toggle hamburger animation
            const bars = navToggle.querySelectorAll('.bar');
            if (navToggle.classList.contains('active')) {
                bars[0].style.transform = 'rotate(-45deg) translate(-5px, 6px)';
                bars[1].style.opacity = '0';
                bars[2].style.transform = 'rotate(45deg) translate(-5px, -6px)';
            } else {
                bars[0].style.transform = 'none';
                bars[1].style.opacity = '1';
                bars[2].style.transform = 'none';
            }
        });

        // Close mobile menu when a link is clicked
        const links = navLinksContainer.querySelectorAll('.nav-link, .nav-btn');
        links.forEach(link => {
            link.addEventListener('click', () => {
                navLinksContainer.classList.remove('open');
                navToggle.classList.remove('active');
                const bars = navToggle.querySelectorAll('.bar');
                bars.forEach(bar => bar.style.transform = 'none');
                bars[1].style.opacity = '1';
            });
        });
    }

    // 2. Sticky Navbar Scroll Effect
    const navbar = document.getElementById('navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }
        });
    }

    // 3. Scroll Reveal Animations (Intersection Observer)
    const revealElements = document.querySelectorAll('.scroll-reveal');
    if ('IntersectionObserver' in window && revealElements.length > 0) {
        const revealObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                    observer.unobserve(entry.target); // Reveal once
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        revealElements.forEach(el => revealObserver.observe(el));
    } else {
        // Fallback for older browsers
        revealElements.forEach(el => el.classList.add('active'));
    }

    // 4. Contact Form Handling
    const contactForm = document.getElementById('campaign-contact-form');
    const formFeedback = document.getElementById('form-feedback');
    
    if (contactForm && formFeedback) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const message = document.getElementById('message').value.trim();
            
            if (!name || !email || !message) {
                showFeedback(formFeedback, 'Please fill in all required fields.', 'error');
                return;
            }
            
            // Simulating API submit
            showFeedback(formFeedback, 'Sending message...', 'info');
            
            setTimeout(() => {
                showFeedback(formFeedback, `Thank you, ${name}! Your message has been sent to Lisa Ecke's campaign team. We appreciate your support.`, 'success');
                contactForm.reset();
            }, 1200);
        });
    }

    // Helper for showing feedback alerts
    function showFeedback(element, message, type) {
        element.textContent = message;
        element.className = 'form-feedback'; // reset
        
        if (type === 'success') {
            element.classList.add('success');
        } else if (type === 'error') {
            element.classList.add('error');
        } else if (type === 'info') {
            element.style.display = 'block';
            element.style.backgroundColor = '#e2e8f0';
            element.style.color = '#4a5568';
            element.style.border = '1px solid #cbd5e0';
        }
    }

    // 5. Donation Page Interactions
    const amountButtons = document.querySelectorAll('.amount-btn');
    const customAmountInput = document.getElementById('custom-amount');
    const donateSubmitBtn = document.getElementById('donate-submit-btn');
    const donationForm = document.getElementById('donation-portal-form');
    const donationFeedback = document.getElementById('donation-feedback');

    if (donationForm) {
        let selectedAmount = '100'; // Default active button value is 100

        // Handle preset button clicks
        amountButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                // Clear active states
                amountButtons.forEach(b => b.classList.remove('active'));
                
                // Set active class
                btn.classList.add('active');
                selectedAmount = btn.getAttribute('data-amount');
                
                // Clear custom amount input
                if (customAmountInput) customAmountInput.value = '';
                
                // Update button text
                updateDonateButtonText(selectedAmount);
            });
        });

        // Handle custom amount text entry
        if (customAmountInput) {
            customAmountInput.addEventListener('input', () => {
                // Clear active button states
                amountButtons.forEach(btn => btn.classList.remove('active'));
                
                const val = customAmountInput.value.trim();
                
                if (val && parseFloat(val) > 0) {
                    selectedAmount = val;
                } else {
                    selectedAmount = '0';
                }
                
                updateDonateButtonText(selectedAmount);
            });
        }

        // Update donate submit button label
        function updateDonateButtonText(amount) {
            if (donateSubmitBtn) {
                const formatted = parseFloat(amount).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
                if (amount && parseFloat(amount) > 0) {
                    donateSubmitBtn.textContent = `Donate $${formatted} Now`;
                } else {
                    donateSubmitBtn.textContent = `Donate Now`;
                }
            }
        }

        // Handle donation submit
        donationForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            const firstName = document.getElementById('first-name').value.trim();
            const lastName = document.getElementById('last-name').value.trim();
            const email = document.getElementById('email').value.trim();
            const employer = document.getElementById('employer').value.trim();
            const occupation = document.getElementById('occupation').value.trim();
            const checkAgreed = document.getElementById('compliance-check').checked;

            if (!firstName || !lastName || !email || !employer || !occupation || !checkAgreed) {
                showFeedback(donationFeedback, 'Please fill in all donor fields and agree to the compliance statement.', 'error');
                return;
            }

            if (!selectedAmount || parseFloat(selectedAmount) <= 0) {
                showFeedback(donationFeedback, 'Please select or enter a donation amount.', 'error');
                return;
            }

            showFeedback(donationFeedback, 'Connecting to campaign fundraising portal...', 'info');

            setTimeout(() => {
                showFeedback(donationFeedback, `Thank you, ${firstName}! This donation simulator is complete. In production, this contribution of $${parseFloat(selectedAmount).toLocaleString()} would be safely processed via WinRed.`, 'success');
                donationForm.reset();
                amountButtons.forEach(b => b.classList.remove('active'));
                if (amountButtons[2]) amountButtons[2].classList.add('active'); // reset to $100 preset
                selectedAmount = '100';
                updateDonateButtonText(selectedAmount);
            }, 1500);
        });
    }

    // 6. Navigation Link Active Highlighting on Scroll
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links .nav-link');

    if (sections.length > 0 && navLinks.length > 0) {
        window.addEventListener('scroll', () => {
            let current = '';
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;
                if (window.scrollY >= (sectionTop - 150)) {
                    current = section.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });
        });
    }
});
