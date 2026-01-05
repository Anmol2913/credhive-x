// Public API endpoints (no auth required)
const BASE_URL = 'http://127.0.0.1:3000';

// Fetch site content and features on page load
async function loadSiteConfig(){
  try{
    const [contentRes, featuresRes] = await Promise.all([
      fetch(`${BASE_URL}/api/public/content`).catch(() => null),
      fetch(`${BASE_URL}/api/public/features`).catch(() => null)
    ]);
    
    if(contentRes && contentRes.ok){
      const content = await contentRes.json();
      updateSiteContent(content);
    }
    
    if(featuresRes && featuresRes.ok){
      const features = await featuresRes.json();
      updateSiteFeatures(features);
    }
  }catch(e){
    console.warn('Could not load dynamic content', e);
  }
}

function updateSiteContent(content){
  // Update hero if present
  const heroTitle = document.querySelector('.hero-left .title, .title');
  if(heroTitle && content.heroTitle) heroTitle.textContent = content.heroTitle;
  
  const heroSubtitle = document.querySelector('.hero-left .subtitle, .subtitle');
  if(heroSubtitle && content.heroSubtitle) heroSubtitle.textContent = content.heroSubtitle;
  
  // Update footer
  const footer = document.querySelector('footer .footer-text, footer');
  if(footer && content.footerText){
    const existing = footer.querySelector('.footer-text');
    if(existing) existing.textContent = content.footerText;
  }
  
  // Update contact info
  document.querySelectorAll('a[href^="mailto:"]').forEach(el => {
    if(content.contactEmail) el.href = 'mailto:' + content.contactEmail;
  });
  
  document.querySelectorAll('a[href^="tel:"]').forEach(el => {
    if(content.contactPhone) el.href = 'tel:' + content.contactPhone.replace(/\s/g, '');
  });
}

function updateSiteFeatures(features){
  // Hide/show features based on admin settings
  if(features.kyc === false){
    document.querySelectorAll('#kyc-card, [data-feature="kyc"]').forEach(el => el.style.display = 'none');
  }
  
  if(features.emi === false){
    document.querySelectorAll('#instant-card, [data-feature="emi"]').forEach(el => el.style.display = 'none');
  }
  
  if(features.vault === false){
    document.querySelectorAll('#savings-card, [data-feature="vault"]').forEach(el => el.style.display = 'none');
  }
  
  if(features.contact === false){
    document.querySelectorAll('.contact-form, [data-feature="contact"]').forEach(el => el.style.display = 'none');
  }
  
  if(features.register === false){
    document.querySelectorAll('#authTabRegister, [data-feature="register"]').forEach(el => el.style.display = 'none');
  }
}

// Auto-load on page ready
if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', loadSiteConfig);
} else {
  loadSiteConfig();
}
