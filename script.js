document.addEventListener('DOMContentLoaded', () => {

  // ── Anno Footer ──
  const yrEl = document.getElementById('yr');
  if (yrEl) yrEl.textContent = new Date().getFullYear();

  // ── CARICAMENTO ROBUSTO ESEGUIBILE DEL FILE ORBIT ESTERNO ──
  async function loadExternalOrbit() {
    const container = document.getElementById('orbit-container');
    if (!container) return;

    // Sorgenti dell'Orbit esterno con cache-busting
    const urls = [
      'https://rmstudio.app/public/orbit-template.html?v=' + Date.now(),
      'https://raw.githubusercontent.com/Rickym2025/mrstudio/main/public/orbit-template.html?v=' + Date.now()
    ];

    let html = '';
    for (const url of urls) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          html = await res.text();
          if (html && html.trim().length > 0) break;
        }
      } catch (e) {
        console.warn('Attempt Orbit fetch fallito per:', url);
      }
    }

    if (html) {
      container.innerHTML = html;

      // RE-INIEZIONE ED ESECUZIONE ATTIVA DEI TAG <SCRIPT> CONTENUTI NELL'ORBIT ESTERNO
      const scripts = container.querySelectorAll('script');
      scripts.forEach(oldScript => {
        const newScript = document.createElement('script');
        Array.from(oldScript.attributes).forEach(attr => newScript.setAttribute(attr.name, attr.value));
        newScript.appendChild(document.createTextNode(oldScript.innerHTML));
        oldScript.parentNode.replaceChild(newScript, oldScript);
      });
    } else {
      container.innerHTML = '<p class="text-xs text-gray-500">RM Studio Ecosystem</p>';
    }
  }

  loadExternalOrbit();

  // ── OTTIMIZZAZIONE LAZY VIDEO (ZERO SCATTI) ──
  const lazyVideos = document.querySelectorAll('.lazy-video');
  const videoObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const video = entry.target;
      if (entry.isIntersecting) {
        if (!video.src && video.dataset.src) {
          video.src = video.dataset.src;
        }
        video.play().catch(()=>{});
      } else {
        video.pause();
      }
    });
  }, { threshold: 0.15 });

  lazyVideos.forEach(v => videoObserver.observe(v));

  // ── FORM CONTATTO (Web3Forms + n8n) ──
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('submit-btn');
      const msg = document.getElementById('form-msg');
      btn.textContent = 'Invio in corso...';
      btn.disabled = true;

      const formData = new FormData(contactForm);
      const payload = {
        name: formData.get('name'),
        email: formData.get('email'),
        website: formData.get('website')
      };

      const web3Promise = fetch('https://api.web3forms.com/submit', { method: 'POST', body: formData });
      const n8nPromise = fetch('https://n8n.rmstudio.app/webhook/vision-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      try {
        const [res1, res2] = await Promise.all([web3Promise, n8nPromise]);
        if (res1.ok && res2.ok) {
          msg.textContent = '✓ Richiesta inviata! Ti risponderemo entro 24 ore.';
          msg.style.color = '#4ade80';
          contactForm.reset();
        } else { throw new Error(); }
      } catch {
        msg.textContent = '✗ Errore durante l\'invio. Riprova a breve.';
        msg.style.color = '#f87171';
      } finally {
        msg.classList.remove('hidden');
        btn.textContent = 'Invia Richiesta';
        btn.disabled = false;
      }
    });
  }

  // ── CHATBOT WIDGET ──
  const bubble = document.getElementById('vision-chat-bubble');
  const win = document.getElementById('vision-chat-window');
  const closeBtn = document.getElementById('vision-chat-close');
  const input = document.getElementById('vision-chat-input');
  const submitBtn = document.getElementById('vision-chat-submit');
  const messagesDiv = document.getElementById('vision-chat-messages');

  if (bubble && win) {
    bubble.onclick = () => win.classList.toggle('chat-open');
    if (closeBtn) closeBtn.onclick = () => win.classList.remove('chat-open');

    let chatSessionId = localStorage.getItem('vision_chat_session') || ('sess_' + Date.now());
    localStorage.setItem('vision_chat_session', chatSessionId);

    async function sendChatMsg() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      appendMsg(text, 'user');

      try {
        const res = await fetch('https://n8n.rmstudio.app/webhook/vision-chatbot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, sessionId: chatSessionId })
        });
        const raw = await res.text();
        let reply = 'Risposta ricevuta.';
        if (raw) {
          try { reply = JSON.parse(raw).response || raw; } catch(_) { reply = raw; }
        }
        appendMsg(reply, 'bot');
      } catch {
        appendMsg('Errore di connessione.', 'bot');
      }
    }

    if (submitBtn) submitBtn.onclick = sendChatMsg;
    if (input) input.onkeypress = (e) => { if (e.key === 'Enter') sendChatMsg(); };

    function appendMsg(text, sender) {
      const div = document.createElement('div');
      div.className = `msg ${sender}`;
      div.innerHTML = String(text).replace(/\n/g, '<br>');
      messagesDiv.appendChild(div);
      messagesDiv.scrollTop = messagesDiv.scrollHeight;
    }
  }
});

// ── FULLSCREEN MODAL VIDEO PLAYER (CON AUDIO AL 100%) ──
function openFullscreenModal(videoSrc, handle, caption) {
  const overlay = document.getElementById('fs-overlay');
  const fsVideo = document.getElementById('fs-video');
  const fsHandle = document.getElementById('fs-handle');
  const fsCaption = document.getElementById('fs-caption');

  if (!overlay || !fsVideo) return;

  fsVideo.src = videoSrc;
  fsVideo.muted = false; // RIPRODUZIONE AUDIO ATTIVA
  fsVideo.volume = 1;

  if (fsHandle) fsHandle.textContent = handle;
  if (fsCaption) fsCaption.textContent = caption;

  overlay.style.display = 'flex';
  fsVideo.play().catch(e => {
    console.log("Autoplay audio bloccato, riprovo:", e);
    fsVideo.muted = true;
    fsVideo.play();
  });
}

function closeFullscreenModal() {
  const overlay = document.getElementById('fs-overlay');
  const fsVideo = document.getElementById('fs-video');

  if (overlay) overlay.style.display = 'none';
  if (fsVideo) {
    fsVideo.pause();
    fsVideo.src = '';
  }
}

document.addEventListener('keydown', e => { if (e.key === 'Escape') closeFullscreenModal(); });
