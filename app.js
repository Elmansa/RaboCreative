// app.js - Rabo Design gallery + special lightbox player
async function fetchPortfolio(){
  const res = await fetch('portfolio.json');
  const data = await res.json();
  return data;
}

function isYouTube(url){
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/)/.test(url);
}
function getYouTubeEmbed(url){
  const m = url.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?rel=0&autoplay=1` : url;
}

/* render portfolio grid into containerId */
async function renderPortfolio(containerId){
  const items = await fetchPortfolio();
  const container = document.getElementById(containerId);
  if(!container) return;
  if(items.length === 0){
    container.innerHTML = `<p class="hint">هنوز نمونه‌کاری اضافه نشده.</p>`;
    return;
  }

  const grid = document.createElement('div');
  grid.className = 'grid';

  items.forEach(item => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <img class="thumb" src="${escapeHtml(item.cover)}" alt="${escapeHtml(item.title)}" />
      <div class="meta">
        <div>
          <div class="title">${escapeHtml(item.title)}</div>
          <div class="hint">${escapeHtml(item.description || '')}</div>
        </div>
        <div>
          <div class="type">${item.type === 'video' ? 'ویدیو' : 'عکس'}</div>
        </div>
      </div>
    `;
    // open lightbox with index
    card.addEventListener('click', () => openLightbox(item));
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

/* LIGHTBOX / PLAYER */
const Lightbox = {
  visibleItem: null,
  init: function(){
    // create DOM
    if(document.querySelector('.lightbox')) return;
    const html = `
      <div class="lightbox" id="rabo-lightbox" aria-hidden="true">
        <div class="lb-inner" role="dialog" aria-modal="true">
          <div class="lb-media" id="lb-media"></div>
          <div class="lb-info">
            <div>
              <div class="lb-title" id="lb-title">—</div>
              <div class="lb-desc" id="lb-desc"></div>
            </div>
            <div class="lb-controls">
              <button class="lb-btn" id="lb-prev">⟨ قبلی</button>
              <button class="lb-btn" id="lb-next">بعدی ⟩</button>
              <button class="lb-btn" id="lb-download">دانلود</button>
              <button class="lb-btn primary" id="lb-close">بستن ✕</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', html);
    this.cache();
    this.bind();
  },
  cache: function(){
    this.el = {
      root: document.getElementById('rabo-lightbox'),
      media: document.getElementById('lb-media'),
      title: document.getElementById('lb-title'),
      desc: document.getElementById('lb-desc'),
      prev: document.getElementById('lb-prev'),
      next: document.getElementById('lb-next'),
      download: document.getElementById('lb-download'),
      close: document.getElementById('lb-close')
    };
  },
  bind: function(){
    const self = this;
    this.el.close.addEventListener('click', ()=> this.close());
    this.el.root.addEventListener('click', (e)=>{ if(e.target === this.el.root) this.close(); });
    document.addEventListener('keydown', (e)=> {
      if(this.el.root.style.display !== 'flex') return;
      if(e.key === 'Escape') this.close();
      if(e.key === 'ArrowLeft') this.prev();
      if(e.key === 'ArrowRight') this.next();
    });
    this.el.prev.addEventListener('click', ()=> this.prev());
    this.el.next.addEventListener('click', ()=> this.next());
    this.el.download.addEventListener('click', ()=> this.download());
  },
  open: function(item, list){
    this.list = list || null;
    this.visibleItem = item;
    this.render();
    this.el.root.style.display = 'flex';
    this.el.root.setAttribute('aria-hidden', 'false');
  },
  close: function(){
    // stop any playing iframe by replacing media
    this.el.media.innerHTML = '';
    this.el.root.style.display = 'none';
    this.el.root.setAttribute('aria-hidden', 'true');
  },
  render: function(){
    const it = this.visibleItem;
    this.el.title.textContent = it.title;
    this.el.desc.textContent = it.description || '';
    this.el.download.style.display = it.type === 'image' ? 'inline-block' : 'inline-block';

    // render media
    this.el.media.innerHTML = '';
    if(it.type === 'image'){
      const img = document.createElement('img');
      img.src = it.src;
      img.alt = it.title;
      img.style.maxHeight = '80vh';
      img.style.objectFit = 'contain';
      this.el.media.appendChild(img);
    } else if(it.type === 'video'){
      if(isYouTube(it.src)){
        const iframe = document.createElement('iframe');
        iframe.src = getYouTubeEmbed(it.src);
        iframe.width = '100%';
        iframe.height = '100%';
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
        iframe.allowFullscreen = true;
        this.el.media.appendChild(iframe);
      } else {
        // generic video via iframe or video tag (try video tag)
        const video = document.createElement('video');
        video.src = it.src;
        video.controls = true;
        video.autoplay = true;
        video.style.maxHeight = '80vh';
        this.el.media.appendChild(video);
      }
    }
    // set download/href
    this.el.download.onclick = ()=> {
      const a = document.createElement('a');
      a.href = it.src;
      a.download = it.title || 'file';
      a.click();
    };
  },
  openById: async function(id){
    const list = await fetchPortfolio();
    const it = list.find(x => x.id === id);
    if(it) this.open(it, list);
  },
  prev: async function(){
    if(!this.list) this.list = await fetchPortfolio();
    const idx = this.list.findIndex(x => x.id === this.visibleItem.id);
    const prev = this.list[(idx - 1 + this.list.length) % this.list.length];
    this.visibleItem = prev;
    this.render();
  },
  next: async function(){
    if(!this.list) this.list = await fetchPortfolio();
    const idx = this.list.findIndex(x => x.id === this.visibleItem.id);
    const nextItem = this.list[(idx + 1) % this.list.length];
    this.visibleItem = nextItem;
    this.render();
  },
  download: function(){ /* handled in render */ }
};

function openLightbox(item){
  Lightbox.init();
  Lightbox.open(item);
}

/* Utility */
function escapeHtml(s){ return (s+'').replace(/[&<>"']/g, function(m){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]}); }

/* AUTO INIT for pages */
document.addEventListener('DOMContentLoaded', async () => {
  // if index/portfolio pages have container IDs, render
  if(document.getElementById('portfolio-root')) await renderPortfolio('portfolio-root');
  // if single project page: project.html?id=proj-1
  if(document.getElementById('project-root')){
    const params = new URLSearchParams(location.search);
    const id = params.get('id');
    if(id){
      const list = await fetchPortfolio();
      const it = list.find(x => x.id === id);
      if(it){
        // populate project page
        const root = document.getElementById('project-root');
        root.innerHTML = `
          <div style="display:flex;gap:22px;align-items:flex-start;flex-wrap:wrap">
            <div style="flex:1;min-width:280px">
              ${it.type === 'image' ? `<img src="${it.src}" style="width:100%;border-radius:10px;object-fit:cover"/>` : `<div style="position:relative;padding-top:56.25%"><iframe src="${isYouTube(it.src)? getYouTubeEmbed(it.src) : it.src}" style="position:absolute;left:0;top:0;width:100%;height:100%;border:0" allow="autoplay;encrypted-media" allowfullscreen></iframe></div>`}
            </div>
            <div style="flex:1;min-width:220px">
              <h2 style="color:var(--accent);margin-top:0">${escapeHtml(it.title)}</h2>
              <p style="color:var(--muted);line-height:1.8">${escapeHtml(it.description || '')}</p>
              <div style="margin-top:16px;display:flex;gap:10px">
                <button class="lb-btn primary" id="proj-play">مشاهده در پلیر</button>
                <a class="lb-btn" href="${it.src}" target="_blank">باز کردن در تب جدید</a>
                <a class="lb-btn" href="mailto:contact@rabodesign.ir">درخواست همکاری</a>
              </div>
            </div>
          </div>
        `;
        document.getElementById('proj-play').addEventListener('click', ()=> openLightbox(it));
      } else {
        document.getElementById('project-root').innerHTML = `<p class="hint">پروژه پیدا نشد.</p>`;
      }
    } else {
      document.getElementById('project-root').innerHTML = `<p class="hint">شناسهٔ پروژه مشخص نیست.</p>`;
    }
  }
});
