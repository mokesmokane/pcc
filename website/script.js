// ===================================
// Supabase Configuration
// ===================================

const SUPABASE_URL = 'https://mfycdfhwqlvqdqjvxdhv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1meWNkZmh3cWx2cWRxanZ4ZGh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MjQyNTUsImV4cCI6MjA3NDIwMDI1NX0.oHBYPFZrfBMyJRPc6nl1RiFgX4VeGDQ5VJHG39yuwO0';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===================================
// Smooth Scrolling Navigation
// ===================================

document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const targetId = this.getAttribute('href');

        if (targetId === '#') return;

        const targetElement = document.querySelector(targetId);

        if (targetElement) {
            const headerOffset = 80;
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });

            // Close mobile menu if open
            const navList = document.querySelector('.nav-list');
            navList.classList.remove('active');
        }
    });
});

// ===================================
// Mobile Menu Toggle
// ===================================

const mobileMenuToggle = document.getElementById('mobileMenuToggle');
const navList = document.querySelector('.nav-list');

mobileMenuToggle.addEventListener('click', () => {
    navList.classList.toggle('active');
    mobileMenuToggle.classList.toggle('active');
});

// Close menu when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.header-content')) {
        navList.classList.remove('active');
        mobileMenuToggle.classList.remove('active');
    }
});

// ===================================
// Active Navigation Link on Scroll
// ===================================

const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('.nav-link');

function updateActiveNavLink() {
    const scrollPosition = window.scrollY + 100;

    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.offsetHeight;
        const sectionId = section.getAttribute('id');

        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${sectionId}`) {
                    link.classList.add('active');
                }
            });
        }
    });
}

window.addEventListener('scroll', updateActiveNavLink);
window.addEventListener('load', updateActiveNavLink);

// ===================================
// Sticky Header
// ===================================

const header = document.getElementById('header');
let lastScrollTop = 0;

window.addEventListener('scroll', () => {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    // Header shadow removed per design requirements
    lastScrollTop = scrollTop;
});

// ===================================
// Testimonials Carousel
// ===================================

const testimonialsTrack = document.getElementById('testimonialsTrack');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');

let currentTestimonial = 0;
const testimonialCards = document.querySelectorAll('.testimonial-card');
const totalTestimonials = testimonialCards.length;

function updateCarousel() {
    const cardWidth = testimonialCards[0].offsetWidth;
    const gap = 30; // Match CSS gap
    const scrollAmount = (cardWidth + gap) * currentTestimonial;

    testimonialsTrack.scrollTo({
        left: scrollAmount,
        behavior: 'smooth'
    });
}

function scrollCarousel(direction) {
    const cardWidth = testimonialCards[0].offsetWidth;
    const gap = 30;
    const scrollAmount = cardWidth + gap;

    if (direction === 'next') {
        testimonialsTrack.scrollBy({
            left: scrollAmount,
            behavior: 'smooth'
        });
    } else {
        testimonialsTrack.scrollBy({
            left: -scrollAmount,
            behavior: 'smooth'
        });
    }
}

function nextTestimonial() {
    currentTestimonial = (currentTestimonial + 1) % totalTestimonials;
    updateCarousel();
}

function prevTestimonial() {
    currentTestimonial = (currentTestimonial - 1 + totalTestimonials) % totalTestimonials;
    updateCarousel();
}

nextBtn.addEventListener('click', () => scrollCarousel('next'));
prevBtn.addEventListener('click', () => scrollCarousel('prev'));

// Auto-play carousel (optional - uncomment to enable)
/*
let autoplayInterval = setInterval(nextTestimonial, 5000);

// Pause autoplay on hover
testimonialsTrack.addEventListener('mouseenter', () => {
    clearInterval(autoplayInterval);
});

testimonialsTrack.addEventListener('mouseleave', () => {
    autoplayInterval = setInterval(nextTestimonial, 5000);
});
*/

// Update carousel on window resize
window.addEventListener('resize', updateCarousel);

// ===================================
// Form Handling
// ===================================

const heroForm = document.getElementById('heroForm');
const footerForm = document.getElementById('footerForm');

async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const firstName = e.target.querySelector('input[type="text"]').value;
    const email = e.target.querySelector('input[type="email"]').value;
    const source = e.target.id === 'heroForm' ? 'hero' : 'footer';

    // Basic validation
    if (!firstName || !email) {
        showFormMessage(e.target, 'Please fill in all fields', 'error');
        return;
    }

    if (!isValidEmail(email)) {
        showFormMessage(e.target, 'Please enter a valid email address', 'error');
        return;
    }

    // Save to Supabase
    try {
        const { data, error } = await supabase
            .from('form_submissions')
            .insert([
                {
                    first_name: firstName,
                    email: email,
                    source: source
                }
            ])
            .select();

        if (error) {
            console.error('Supabase error details:', error);
            throw error;
        }

        console.log('Form submission saved successfully:', data);

        // Show success message
        showFormMessage(e.target, 'Thanks! We\'ll be in touch soon.', 'success');

        // Reset form
        e.target.reset();
    } catch (error) {
        console.error('Error saving to database:', error);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        showFormMessage(e.target, 'Something went wrong. Please try again.', 'error');
    }
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showFormMessage(form, message, type) {
    const submitBtn = form.querySelector('button[type="submit"]');

    if (type === 'success') {
        // Store original button text
        const originalText = submitBtn.textContent;
        const originalBg = submitBtn.style.backgroundColor;

        // Transform button to success state
        submitBtn.textContent = '✓ Submitted!';
        submitBtn.style.backgroundColor = '#78C952';
        submitBtn.style.transition = 'all 0.3s ease';
        submitBtn.disabled = true;

        // Reset button after 3 seconds
        setTimeout(() => {
            submitBtn.style.transition = 'all 0.3s ease';
            submitBtn.textContent = originalText;
            submitBtn.style.backgroundColor = originalBg || '';
            submitBtn.disabled = false;
        }, 3000);
    } else {
        // For errors, show a temporary message below the button
        const existingMessage = form.querySelector('.form-message');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageEl = document.createElement('div');
        messageEl.className = 'form-message form-message-error';
        messageEl.textContent = message;
        messageEl.style.cssText = `
            margin-top: 15px;
            padding: 12px 20px;
            border-radius: 8px;
            font-weight: 500;
            text-align: center;
            background-color: #E85D54;
            color: white;
            animation: slideIn 0.3s ease;
        `;

        form.appendChild(messageEl);

        // Remove error message after 4 seconds
        setTimeout(() => {
            messageEl.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => messageEl.remove(), 300);
        }, 4000);
    }
}

// Add CSS animations for form messages
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }

    @keyframes slideOut {
        from {
            opacity: 1;
            transform: translateY(0);
        }
        to {
            opacity: 0;
            transform: translateY(-10px);
        }
    }
`;
document.head.appendChild(style);

heroForm.addEventListener('submit', handleFormSubmit);
footerForm.addEventListener('submit', handleFormSubmit);

// ===================================
// Intersection Observer for Animations
// ===================================

const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe feature cards, ethos cards, etc. for fade-in animations
document.querySelectorAll('.feature-card, .ethos-card, .testimonial-card').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// ===================================
// Loading & Initialization
// ===================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('Podcast Club website loaded successfully!');

    // Add smooth scroll behavior to html element as fallback
    document.documentElement.style.scrollBehavior = 'smooth';

    // Initialize carousel position
    updateCarousel();
});

// ===================================
// Prevent form submission on Enter in input fields
// ===================================

document.querySelectorAll('.form-input').forEach(input => {
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && input.type !== 'submit') {
            e.preventDefault();
            const form = input.closest('form');
            const submitBtn = form.querySelector('button[type="submit"]');
            submitBtn.click();
        }
    });
});
