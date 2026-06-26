// ==========================================
// Firebase Realtime Database Integration
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyAiQMuHLrNxwOXgbw64-Hh7rceeRt9N-Ws",
  authDomain: "cheer-led-app.firebaseapp.com",
  databaseURL: "https://cheer-led-app-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "cheer-led-app",
  storageBucket: "cheer-led-app.firebasestorage.app",
  messagingSenderId: "901449615588",
  appId: "1:901449615588:web:923eb803a4fb17882584f1",
  measurementId: "G-H1FTX6CL0F"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const messagesRef = db.ref('messages');

// Listen to incoming messages in real-time
messagesRef.on('child_added', (snapshot) => {
    const data = snapshot.val();
    if (data && data.name && data.text) {
        enqueueMessage({ name: data.name, text: data.text });
    }
});

// ==========================================
// App State Variables
// ==========================================
let currentMessageCount = 0;
const MAX_MESSAGES = 100;
const activeMessages = [];
const messageQueue = [];
let isTransitioning = false;
let currentSlide = 0;

// ==========================================
// Custom Slogan Formatter (2-Line Space-Splitting)
// ==========================================
function formatSlogan(text) {
    if (!text) return '';
    
    const spaces = [];
    for (let i = 0; i < text.length; i++) {
        if (text[i] === ' ') {
            spaces.push(i);
        }
    }
    
    // Split at the first space where the prefix has at least 4 characters
    for (const spaceIdx of spaces) {
        const firstLine = text.substring(0, spaceIdx);
        const nonSpaceLen = firstLine.replace(/\s+/g, '').length;
        if (nonSpaceLen >= 4) {
            const secondLine = text.substring(spaceIdx + 1);
            return `<div class="slogan-line">${firstLine}</div><div class="slogan-line">${secondLine}</div>`;
        }
    }
    
    // Otherwise, render on a single line
    return `<div class="slogan-line">${text}</div>`;
}

// ==========================================
// Random Positioning (Left & Right Zones, Non-overlapping)
// ==========================================
function getRandomPosition() {
    const app = document.getElementById('app');
    const W = app.clientWidth;
    const H = app.clientHeight;
    
    const cardWidth = 120;
    const cardHeight = 40;
    const margin = 15;
    
    const cardHalfW = cardWidth / 2;
    const cardHalfH = cardHeight / 2;
    
    // Stepwise overlap gap size checking
    const gaps = [
        { x: 10, y: 8 },
        { x: 5, y: 4 },
        { x: 1, y: 1 }
    ];
    
    for (const gap of gaps) {
        for (let attempt = 0; attempt < 80; attempt++) {
            // Pick Y coordinate first
            const minY = margin + cardHalfH;
            const maxY = H - margin - cardHalfH;
            const y = Math.floor(Math.random() * (maxY - minY)) + minY;
            
            // Determine dynamic banned width around center W / 2 based on Y height
            let centerBannedHalfWidth = 220; // default for middle area (shoulders/head)
            if (y < H * 0.28) {
                // Top area: only torch on the right, allow messages above head!
                centerBannedHalfWidth = 100;
            } else if (y > H * 0.72) {
                // Bottom area: wider body zone
                centerBannedHalfWidth = 240;
            }
            
            // Randomly choose left (0) or right (1) zone
            const isLeft = Math.random() < 0.5;
            let x;
            if (isLeft) {
                const minX = margin + cardHalfW;
                const maxX = W / 2 - centerBannedHalfWidth - cardHalfW;
                if (maxX <= minX) continue;
                x = Math.floor(Math.random() * (maxX - minX)) + minX;
            } else {
                const minX = W / 2 + centerBannedHalfWidth + cardHalfW;
                const maxX = W - margin - cardHalfW;
                if (maxX <= minX) continue;
                x = Math.floor(Math.random() * (maxX - minX)) + minX;
            }
            
            // Avoid top-right corner zone (QR container & action controls)
            if (!isLeft && x > W - 180 && y < 220) {
                continue;
            }
            
            // Check overlaps with already active slogans on the screen
            let overlaps = false;
            for (const active of activeMessages) {
                const dx = Math.abs(x - active.x);
                const dy = Math.abs(y - active.y);
                if (dx < cardWidth + gap.x && dy < cardHeight + gap.y) {
                    overlaps = true;
                    break;
                }
            }
            
            if (!overlaps) {
                return { x, y };
            }
        }
    }
    
    // Fallback: spawn with absolute random bounds (forces layout even when overcrowded)
    const isLeftFallback = Math.random() < 0.5;
    let x;
    const y = Math.floor(Math.random() * (H - cardHeight - margin * 2)) + margin + cardHalfH;
    
    let centerBannedHalfWidth = 220;
    if (y < H * 0.28) centerBannedHalfWidth = 100;
    else if (y > H * 0.72) centerBannedHalfWidth = 240;
    
    if (isLeftFallback) {
        x = Math.floor(Math.random() * (W / 2 - centerBannedHalfWidth - cardWidth - margin * 2)) + margin + cardHalfW;
    } else {
        x = Math.floor(Math.random() * (W / 2 - centerBannedHalfWidth - cardWidth - margin * 2)) + W / 2 + centerBannedHalfWidth + cardHalfW;
    }
    return { x, y };
}

// ==========================================
// Message Queueing & Spawn
// ==========================================
function enqueueMessage(msg) {
    if (currentMessageCount >= MAX_MESSAGES) return;
    messageQueue.push(msg);
    processQueue();
}

function processQueue() {
    while (messageQueue.length > 0 && currentMessageCount < MAX_MESSAGES) {
        const pos = getRandomPosition();
        if (!pos) break;
        
        const msg = messageQueue.shift();
        currentMessageCount++;
        
        const fillPercent = (currentMessageCount / MAX_MESSAGES) * 100;
        const gaugeCircle = document.getElementById('gauge-circle');
        if (gaugeCircle) {
            gaugeCircle.style.transform = `scale(${fillPercent / 100})`;
        }
        
        const container = document.getElementById('messages-container');
        const msgEl = document.createElement('div');
        msgEl.className = 'floating-message';
        msgEl.innerHTML = `<span class="author">${msg.name}</span>${formatSlogan(msg.text)}`;
        
        msgEl.style.left = pos.x + 'px';
        msgEl.style.top = pos.y + 'px';
        
        container.appendChild(msgEl);
        
        const msgId = Math.random().toString(36).substr(2, 9);
        const activeObj = { id: msgId, element: msgEl, x: pos.x, y: pos.y };
        activeMessages.push(activeObj);
        
        // Popup and entrance animation
        gsap.fromTo(msgEl, 
            { scale: 0, opacity: 0 },
            { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.2)" }
        );
        
        // Gentle micro-animation idle loop (keeps screen feeling alive)
        gsap.to(msgEl, {
            y: "+=6",
            rotation: "random(-1.5, 1.5)",
            duration: "random(1.8, 2.6)",
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut"
        });
    }
    
    // Toggle complete button once the 100 slogans threshold is reached
    if (currentMessageCount >= MAX_MESSAGES) {
        const qr = document.getElementById('corner-qr');
        const completeBtn = document.getElementById('complete-btn');
        const gauge = document.getElementById('gauge-container');
        if (qr && qr.style.display !== 'none' && !completeBtn.classList.contains('visible')) {
            gsap.to(qr, {
                opacity: 0,
                scale: 0.8,
                duration: 0.8,
                ease: "power2.inOut",
                onComplete: () => {
                    qr.style.display = 'none';
                    completeBtn.classList.add('visible');
                }
            });
            
            if (gauge) {
                gsap.to(gauge, {
                    opacity: 0,
                    y: 10,
                    duration: 0.8,
                    ease: "power2.inOut",
                    onComplete: () => {
                        gauge.style.display = 'none';
                    }
                });
            }
        }
    }
}

// ==========================================
// Finale Cinematic Transition & Light Activation
// ==========================================
function triggerFinale() {
    if (isTransitioning) return;
    isTransitioning = true;
    
    const app = document.getElementById('app');
    const centerX = app.clientWidth / 2 + 230;
    const centerY = app.clientHeight * 0.22;
    
    const tl = gsap.timeline();
    
    // 1. Fly and scale down all message cards to the center statue
    activeMessages.forEach((active, index) => {
        // Kill idle floating loops
        gsap.killTweensOf(active.element);
        
        tl.to(active.element, {
            left: centerX,
            top: centerY,
            scale: 0.1,
            opacity: 0,
            duration: 1.2,
            ease: "power3.in"
        }, index * 0.005); // staggering for vortex effect
    });
    
    // 2. White-cyan gradient flash explosion at peak convergence
    tl.to('#flash-overlay', {
        opacity: 1,
        duration: 0.35,
        ease: "power2.in",
        onComplete: () => {
            // Clean up card nodes from DOM
            activeMessages.forEach(active => active.element.remove());
            activeMessages.length = 0;
            
            // Swap statue state: fade in light_stick.png and apply heavy cyan aura filter
            const sourceImg = document.getElementById('source-image');
            sourceImg.style.opacity = '1.0';
            sourceImg.style.filter = "drop-shadow(0 0 45px rgba(0, 212, 255, 1.0)) brightness(1.3)";
            
            // Hide complete button, show arrow button
            document.getElementById('complete-btn').classList.remove('visible');
            document.getElementById('arrow-btn').classList.add('visible');
        }
    }, "-=0.3")
    // 3. Smooth fadeout of the transition flash
    .to('#flash-overlay', {
        opacity: 0,
        duration: 1.5,
        ease: "power2.out"
    })
    // 4. Set statue group into a premium, slow-breathing idle pulse
    .add(() => {
        gsap.to('#combined-container', {
            scale: 1.03,
            duration: 2.5,
            yoyo: true,
            repeat: -1,
            ease: "power1.inOut"
        });
    });
}

// ==========================================
// Slide Navigation Handlers (1.png / 2.png)
// ==========================================
function handleArrowClick() {
    if (currentSlide === 0) {
        // Shift statue group to the right, leaving a 20px margin from right edge
        const appWidth = document.getElementById('app').clientWidth;
        const containerWidth = document.getElementById('combined-container').clientWidth;
        const shiftX = (appWidth / 2) - (containerWidth / 2) - 20;
        
        gsap.to('#combined-container', {
            x: shiftX,
            duration: 1.2,
            ease: "power3.inOut"
        });
        
        // Slide in 1.png from the left
        const slide1 = document.getElementById('slide-img-1');
        
        gsap.fromTo(slide1, 
            { xPercent: -150, opacity: 0 },
            { xPercent: 0, opacity: 1, duration: 1.2, ease: "power3.out", delay: 0.3 }
        );
        
        currentSlide = 1;
    } else if (currentSlide === 1) {
        // Slide out 1.png to the left and slide in 2.png
        const slide1 = document.getElementById('slide-img-1');
        const slide2 = document.getElementById('slide-img-2');
        
        gsap.to(slide1, {
            xPercent: -150,
            opacity: 0,
            duration: 0.8,
            ease: "power3.in"
        });
        
        gsap.fromTo(slide2,
            { xPercent: -150, opacity: 0 },
            { xPercent: 0, opacity: 1, duration: 1.2, ease: "power3.out", delay: 0.2 }
        );
        
        currentSlide = 2;
    }
}

// ==========================================
// Initialization & BroadcastChannel Setup
// ==========================================
window.onload = () => {
    // Set click events on interactive buttons
    document.getElementById('complete-btn').addEventListener('click', triggerFinale);
    document.getElementById('arrow-btn').addEventListener('click', handleArrowClick);
    
    // BroadcastChannel support for offline/tab-to-tab real-time testing
    try {
        const bc = new BroadcastChannel('cheer_channel');
        bc.onmessage = (event) => {
            const data = event.data;
            if (data && data.name && data.text) {
                enqueueMessage(data);
            }
        };
    } catch (e) {
        console.warn("BroadcastChannel is blocked or unsupported on this browser.", e);
    }
    
    // Debug Controls: Simulation setup
    const testNames = ['홍길동', '이영희', '김민수', '박지혜', '최정우', '정다은', '강동현', '임재범'];
    const testMsgs = [
        '전쟁약탈 미국규탄',
        '군국주의망령 일본반대',
        '평화수호 나라사랑',
        '한반도 평화통일',
        '자주독립 민주주의',
        '역사외곡 일규탄',
        '동해영토 수호하자',
        '민족정기 바로세움',
        '미국 제국주의 세력 규탄한다',
        '군국주의 망령 부활하는 일본 반대',
        '한반도 자주 평화와 조국통일 만세'
    ];
    
    document.getElementById('btn-simulate').addEventListener('click', () => {
        // Send a single random message
        const randomName = testNames[Math.floor(Math.random() * testNames.length)];
        const randomMsg = testMsgs[Math.floor(Math.random() * testMsgs.length)];
        enqueueMessage({ name: randomName, text: randomMsg });
    });
    
    // Add quick fill feature to debug controls for instant testing
    const debugDiv = document.getElementById('debug-controls');
    const fillBtn = document.createElement('button');
    fillBtn.innerText = '테스트: 100개 채우기';
    fillBtn.style.marginLeft = '10px';
    fillBtn.addEventListener('click', () => {
        const remaining = MAX_MESSAGES - currentMessageCount;
        for (let i = 0; i < remaining; i++) {
            const randomName = testNames[Math.floor(Math.random() * testNames.length)];
            const randomMsg = testMsgs[Math.floor(Math.random() * testMsgs.length)];
            enqueueMessage({ name: randomName, text: randomMsg });
        }
    });
    debugDiv.appendChild(fillBtn);
};
