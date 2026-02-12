(function(){
  'use strict';

  var currentUser = null;

  /* ===== SVG ICONS FOR THEME TOGGLE ===== */
  var MOON_SVG = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M13 9.6A6 6 0 016.4 3 6 6 0 1013 9.6z"/></svg>';
  var SUN_SVG = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="8" cy="8" r="2.5"/><path d="M8 2v1.5M8 12.5V14M2 8h1.5M12.5 8H14M4.2 4.2l1 1M10.8 10.8l1 1M4.2 11.8l1-1M10.8 5.2l1-1"/></svg>';

  /* ===== RANK INSIGNIA PIPS ===== */
  var STAR_PIP = '<svg width="9" height="9" viewBox="0 0 12 12"><polygon points="6,1 7.5,4.5 11,4.9 8.5,7.2 9.1,10.7 6,9 2.9,10.7 3.5,7.2 1,4.9 4.5,4.5" fill="currentColor"/></svg>';
  var CHEVRON_PIP = '<svg width="10" height="6" viewBox="0 0 12 7"><path d="M2 6L6 2l4 4" stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var DOT_PIP = '<svg width="5" height="5" viewBox="0 0 6 6"><circle cx="3" cy="3" r="2.5" fill="currentColor"/></svg>';
  var BAR_PIP = '<svg width="10" height="4" viewBox="0 0 12 4"><rect x="1" y="1" width="10" height="2" rx="1" fill="currentColor"/></svg>';

  function getRankInsignia(rank){
    var s=STAR_PIP, c=CHEVRON_PIP, d=DOT_PIP, b=BAR_PIP;
    var map={
      'Lieutenant General':s+s+s, 'Major General':s+s, 'Brigadier':s+d,
      'Colonel':s, 'Major':d+d+d, 'Captain':d+d, 'Lieutenant':d,
      'Subedar Major':c+c+c+d, 'Subedar':c+c+d, 'Naib Subedar':c+d,
      'Havaldar':c+c+c, 'Naik':c+c, 'Lance Naik':c, 'Soldier':b
    };
    return map[rank]||'';
  }

  /* ===== STORAGE ===== */
  var Store = {
    get: function(k){ try{ return JSON.parse(localStorage.getItem(k)); } catch(e){ return null; } },
    set: function(k,v){ localStorage.setItem(k, JSON.stringify(v)); },
    del: function(k){ localStorage.removeItem(k); }
  };

  /* ===== TOAST ===== */
  function toast(msg, type){
    type = type || '';
    var el = document.createElement('div');
    el.className = 'toast' + (type ? ' ' + type : '');
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(function(){ el.classList.add('show'); });
    setTimeout(function(){ el.classList.remove('show'); setTimeout(function(){ el.remove(); }, 200); }, 2500);
  }

  /* ===== SHELL SWITCHING ===== */
  function hideAllShells(){
    document.getElementById('publicShell').classList.add('hidden');
    document.getElementById('onboardingShell').classList.add('hidden');
    document.getElementById('loadingShell').classList.add('hidden');
    document.getElementById('appShell').classList.remove('visible');
  }

  function showPublicShell(){
    hideAllShells();
    document.getElementById('publicShell').classList.remove('hidden');
    pubNav('landing');
  }

  function showOnboardingShell(){
    hideAllShells();
    document.getElementById('onboardingShell').classList.remove('hidden');
    // Set welcome name
    if(currentUser){
      var el = document.getElementById('ob-user-name');
      if(el) el.textContent = currentUser.rank + ' ' + currentUser.lastName;
    }
    // Reset to step 1
    document.getElementById('ob-step-1').classList.add('active');
    document.getElementById('ob-step-2').classList.remove('active');
    document.getElementById('ob-ind-1').classList.add('active');
    document.getElementById('ob-ind-1').classList.remove('done');
    document.getElementById('ob-line-1').classList.remove('done');
    document.getElementById('ob-ind-2').classList.remove('active');

    // Reset mission selections (don't re-attach listeners — init does that once)
    obSelectedMissions = [];
    var cards = document.querySelectorAll('.mission-card');
    for(var i = 0; i < cards.length; i++) cards[i].classList.remove('selected');
    var ct = document.getElementById('obSelCount');
    if(ct) ct.textContent = '0 deployments selected';
  }

  function showLoadingShell(callback){
    hideAllShells();
    document.getElementById('loadingShell').classList.remove('hidden');
    setTimeout(function(){
      if(callback) callback();
    }, 2200);
  }

  function showAppShell(){
    hideAllShells();
    document.getElementById('appShell').classList.add('visible');
    updateSidebarUser();
    navigate('dashboard');
  }

  /* ===== PUBLIC NAVIGATION (landing / login / signup) ===== */
  window.pubNav = function(page){
    var pages = document.querySelectorAll('.pub-page');
    for(var i = 0; i < pages.length; i++) pages[i].classList.remove('active');
    var target = document.getElementById('pub-' + page);
    if(target) target.classList.add('active');
    var pubContent = document.querySelector('.pub-content');
    if(pubContent) pubContent.scrollTop = 0;
  };

  /* ===== APP NAVIGATION (dashboard / profile / about / contact) ===== */
  window.navigate = function(page){
    var pages = document.querySelectorAll('.page');
    for(var i = 0; i < pages.length; i++) pages[i].classList.remove('active');
    var target = document.getElementById('page-' + page);
    if(!target) return;
    target.classList.add('active');

    // Sidebar active state
    var navItems = document.querySelectorAll('.nav-item');
    for(var j = 0; j < navItems.length; j++) navItems[j].classList.remove('active');
    var navItem = document.querySelector('.nav-item[data-page="' + page + '"]');
    if(navItem) navItem.classList.add('active');

    // Topbar title
    var titles = {dashboard:'Command Center',profile:'Service Record',about:'System Directive',contact:'Secure Comms'};
    document.getElementById('topbar-title').textContent = titles[page] || page;

    if(page === 'dashboard') loadDashboard();
    if(page === 'profile') loadProfile();
    if(page === 'about'){
      // Scroll hint to developer section (once per session)
      if(!sessionStorage.getItem('aditi_dev_hint')){
        sessionStorage.setItem('aditi_dev_hint', '1');
        setTimeout(function(){
          var hint = document.createElement('div');
          hint.className = 'scroll-hint';
          hint.innerHTML = '<span class="scroll-hint-arrow">&#8595;</span> scroll down to meet the architect';
          hint.onclick = function(){
            var devSec = document.querySelector('.developer-section');
            if(devSec) devSec.scrollIntoView({behavior:'smooth',block:'center'});
            hint.style.opacity = '0';
            setTimeout(function(){ if(hint.parentNode) hint.parentNode.removeChild(hint); }, 500);
          };
          var content = document.querySelector('.content');
          if(content) content.appendChild(hint);
          setTimeout(function(){
            if(hint.parentNode) hint.parentNode.removeChild(hint);
          }, 6000);
        }, 800);
      }
    }
    if(page === 'contact'){
      renderMessages();
      if(currentUser){
        var n = document.getElementById('contact-name');
        var e = document.getElementById('contact-email');
        if(n && !n.value) n.value = currentUser.firstName + ' ' + currentUser.lastName;
        if(e && !e.value) e.value = currentUser.email;
      }
    }

    closeSidebar();
    document.querySelector('.content').scrollTop = 0;
  };

  /* ===== SIDEBAR MOBILE ===== */
  window.toggleSidebar = function(){
    document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('mobileOverlay').classList.toggle('show');
  };
  window.closeSidebar = function(){
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('mobileOverlay').classList.remove('show');
  };

  /* ===== SIGNUP ===== */
  window.handleSignup = function(e){
    e.preventDefault();
    var first = document.getElementById('signup-first').value.trim();
    var last = document.getElementById('signup-last').value.trim();
    var email = document.getElementById('signup-email').value.trim().toLowerCase();
    var rank = document.getElementById('signup-rank').value;
    var pass = document.getElementById('signup-pass').value;
    var confirm = document.getElementById('signup-confirm').value;
    var errEl = document.getElementById('signup-error');

    errEl.style.display = 'none';
    function err(m){ errEl.textContent = m; errEl.style.display = 'block'; }

    if(!first || !last) return err('Personnel name is required.');
    if(!email) return err('Service ID is required.');
    if(!rank) return err('Rank designation is required.');
    if(pass.length < 8) return err('Security passphrase must be at least 8 characters.');
    if(pass !== confirm) return err('Security passphrases do not match.');
    if(Store.get('aditi_u_' + email)) return err('Service ID already registered in local registry.');

    var user = {
      id: email, firstName: first, lastName: last, email: email, rank: rank,
      password: btoa(pass),
      bio: '',
      profilePic: '',
      editCount: 0,
      phone: '',
      location: '',
      regiment: '',
      warCry: 'Bharat Mata Ki Jai',
      warCryTrans: 'Victory to Mother India',
      missions: [],
      onboarded: false,
      social: { linkedin: '', instagram: '', facebook: '', x: '' },
      createdAt: new Date().toISOString()
    };

    Store.set('aditi_u_' + email, user);
    Store.set('aditi_session', user);
    currentUser = user;
    document.getElementById('signupForm').reset();
    toast('Personnel successfully enrolled. Proceeding to Service Record Initialization. Jai Hind.', 'success');
    showOnboardingShell();
  };

  /* ===== LOGIN ===== */
  window.handleLogin = function(e){
    e.preventDefault();
    var email = document.getElementById('login-email').value.trim().toLowerCase();
    var pass = document.getElementById('login-password').value;
    var errEl = document.getElementById('login-error');

    errEl.style.display = 'none';
    function err(m){ errEl.textContent = m; errEl.style.display = 'block'; }

    if(!email) return err('Service ID is required.');
    if(!pass) return err('Security passphrase is required.');

    var stored = Store.get('aditi_u_' + email);
    if(!stored) return err('Service ID not found in records.');
    if(stored.password !== btoa(pass)) return err('Credential verification failed. Access denied.');

    currentUser = stored;
    Store.set('aditi_session', stored);
    document.getElementById('loginForm').reset();
    errEl.style.display = 'none';
    toast(currentUser.warCry + ' — Session initialized, ' + currentUser.rank + ' ' + currentUser.lastName + '. Duty first.', 'success');
    if(!currentUser.onboarded){
      showOnboardingShell();
    } else {
      showAppShell();
    }
  };

  /* ===== LOGOUT ===== */
  window.logout = function(){
    if(!confirm('Terminate session? All data preserved locally. Jai Hind.')) return;
    currentUser = null;
    Store.del('aditi_session');
    toast('Session terminated. All data secured. Jai Hind.');
    showPublicShell();
  };

  /* ===== SIDEBAR USER INFO ===== */
  function updateSidebarUser(){
    if(!currentUser) return;
    var ini = (currentUser.firstName[0] + currentUser.lastName[0]).toUpperCase();
    var avatarEl = document.getElementById('sidebar-avatar');
    if(currentUser.profilePic){
      avatarEl.innerHTML = '<img src="' + currentUser.profilePic + '" alt="Profile picture">';
    } else {
      avatarEl.textContent = ini;
    }
    document.getElementById('sidebar-name').textContent = currentUser.firstName + ' ' + currentUser.lastName;
    document.getElementById('sidebar-role').textContent = currentUser.rank;
    var sri = document.getElementById('sidebar-rank-insignia');
    if(sri) sri.innerHTML = getRankInsignia(currentUser.rank);
  }

  /* ===== DASHBOARD ===== */
  function loadDashboard(){
    if(!currentUser) return;
    var u = currentUser;
    document.getElementById('dash-name').textContent = u.firstName;
    document.getElementById('dash-rank').textContent = u.rank;
    var dri = document.getElementById('dash-rank-insignia');
    if(dri) dri.innerHTML = getRankInsignia(u.rank);
    document.getElementById('dash-email').textContent = u.email;
    document.getElementById('dash-rank2').textContent = u.rank;
    document.getElementById('dash-session').textContent = new Date().toLocaleString();
    document.getElementById('dash-created').textContent = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '\u2014';
    document.getElementById('dash-time').textContent = new Date().toLocaleTimeString();

    // War cry banner
    var cry = u.warCry || 'Bharat Mata Ki Jai';
    var trans = u.warCryTrans || 'Victory to Mother India';
    var wcEl = document.getElementById('dash-warcry');
    var wtEl = document.getElementById('dash-warcry-trans');
    if(wcEl) wcEl.textContent = cry;
    if(wtEl) wtEl.textContent = trans;

    // Angel hint — guide to System Directive (once per session)
    if(!sessionStorage.getItem('aditi_angel_shown')){
      sessionStorage.setItem('aditi_angel_shown', '1');
      var whisper = document.createElement('div');
      whisper.className = 'angel-whisper';
      whisper.textContent = 'The architect awaits in the System Directive...';
      document.body.appendChild(whisper);
      // Pulse the sidebar link
      var sdLink = document.querySelector('.nav-item[data-page="about"]');
      if(sdLink) sdLink.classList.add('angel-pulse');
      setTimeout(function(){
        if(whisper.parentNode) whisper.parentNode.removeChild(whisper);
        if(sdLink) sdLink.classList.remove('angel-pulse');
      }, 7000);
    }

    renderDashMissions();
  }

  function renderDashMissions(){
    var missions = (currentUser && currentUser.missions) || [];
    var wrap = document.getElementById('dash-missions');
    var row = document.getElementById('dash-ribbon-row');
    if(!wrap || !row) return;
    if(!missions.length){ wrap.style.display = 'none'; return; }
    wrap.style.display = 'block';
    row.innerHTML = missions.map(function(m){ return '<span class="ribbon-badge">' + esc(m) + '</span>'; }).join('');
  }

  /* ===== PROFILE ===== */
  var pendingPfp = null;

  function loadProfile(){
    if(!currentUser) return;
    var fresh = Store.get('aditi_u_' + currentUser.email);
    if(fresh) currentUser = fresh;

    var u = currentUser;
    var ini = (u.firstName[0] + u.lastName[0]).toUpperCase();
    var edits = u.editCount || 0;
    var locked = edits >= 3;

    // Avatar (display)
    var avatarEl = document.getElementById('p-avatar');
    if(u.profilePic){
      avatarEl.innerHTML = '<img src="' + u.profilePic + '" alt="Profile picture">';
    } else {
      avatarEl.innerHTML = '';
      avatarEl.textContent = ini;
    }

    document.getElementById('p-name').textContent = u.firstName + ' ' + u.lastName;
    document.getElementById('p-rank').textContent = u.rank;
    var pri = document.getElementById('p-rank-insignia');
    if(pri) pri.innerHTML = getRankInsignia(u.rank);
    document.getElementById('p-sid').textContent = 'SID: ' + u.email;

    // Regiment & war cry
    var regInfo = document.getElementById('p-regiment-info');
    if(regInfo){
      var reg = u.regiment || '';
      if(reg){
        regInfo.style.display = 'block';
        document.getElementById('p-regiment').textContent = reg;
        document.getElementById('p-warcry').textContent = u.warCry || 'Bharat Mata Ki Jai';
        document.getElementById('p-warcry-trans').textContent = u.warCryTrans || 'Victory to Mother India';
      } else {
        regInfo.style.display = 'none';
      }
    }

    // Render mission ribbons on profile
    var pRibbonRow = document.getElementById('p-ribbon-row');
    if(pRibbonRow){
      var missions = u.missions || [];
      pRibbonRow.innerHTML = missions.map(function(m){ return '<span class="ribbon-badge">' + esc(m) + '</span>'; }).join('');
    }
    document.getElementById('p-bio').textContent = u.bio || 'In service of the nation, upholding Naam, Namak, Nishan.';
    document.getElementById('p-email').textContent = u.email;
    document.getElementById('p-rank2').textContent = u.rank;
    document.getElementById('p-created').textContent = u.createdAt ? new Date(u.createdAt).toLocaleDateString() : '\u2014';
    document.getElementById('p-edits').textContent = edits + ' / 3';

    // Edit limit banner & button
    var lockBanner = document.getElementById('editLockBanner');
    var editBtn = document.getElementById('btn-edit-toggle');
    if(locked){
      lockBanner.style.display = 'block';
      editBtn.disabled = true;
      editBtn.textContent = 'Authority Exhausted';
    } else {
      lockBanner.style.display = 'none';
      editBtn.disabled = false;
      editBtn.textContent = 'Update Record';
    }

    // Social icons
    var sc = u.social || {};
    var container = document.getElementById('p-socials');
    var html = '';
    if(sc.linkedin) html += '<a class="social-link" href="' + esc(sc.linkedin) + '" target="_blank" rel="noopener" title="LinkedIn"><svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a>';
    if(sc.instagram) html += '<a class="social-link" href="' + esc(sc.instagram) + '" target="_blank" rel="noopener" title="Instagram"><svg viewBox="0 0 24 24"><path d="M12 0C8.74 0 8.333.015 7.053.072 5.775.132 4.905.333 4.14.63c-.789.306-1.459.717-2.126 1.384S.935 3.35.63 4.14C.333 4.905.131 5.775.072 7.053.012 8.333 0 8.74 0 12s.015 3.667.072 4.947c.06 1.277.261 2.148.558 2.913.306.788.717 1.459 1.384 2.126.667.666 1.336 1.079 2.126 1.384.766.296 1.636.499 2.913.558C8.333 23.988 8.74 24 12 24s3.667-.015 4.947-.072c1.277-.06 2.148-.262 2.913-.558.788-.306 1.459-.718 2.126-1.384.666-.667 1.079-1.335 1.384-2.126.296-.765.499-1.636.558-2.913.06-1.28.072-1.687.072-4.947s-.015-3.667-.072-4.947c-.06-1.277-.262-2.149-.558-2.913-.306-.789-.718-1.459-1.384-2.126C21.319 1.347 20.651.935 19.86.63c-.765-.297-1.636-.499-2.913-.558C15.667.012 15.26 0 12 0zm0 2.16c3.203 0 3.585.016 4.85.071 1.17.055 1.805.249 2.227.415.562.217.96.477 1.382.896.419.42.679.819.896 1.381.164.422.36 1.057.413 2.227.057 1.266.07 1.646.07 4.85s-.015 3.585-.074 4.85c-.061 1.17-.256 1.805-.421 2.227-.224.562-.479.96-.899 1.382-.419.419-.824.679-1.38.896-.42.164-1.065.36-2.235.413-1.274.057-1.649.07-4.859.07-3.211 0-3.586-.015-4.859-.074-1.171-.061-1.816-.256-2.236-.421-.569-.224-.96-.479-1.379-.899-.421-.419-.69-.824-.9-1.38-.165-.42-.359-1.065-.42-2.235-.045-1.26-.061-1.649-.061-4.844 0-3.196.016-3.586.061-4.861.061-1.17.255-1.814.42-2.234.21-.57.479-.96.9-1.381.419-.419.81-.689 1.379-.898.42-.166 1.051-.361 2.221-.421 1.275-.045 1.65-.06 4.859-.06l.045.03zm0 3.678a6.162 6.162 0 100 12.324 6.162 6.162 0 100-12.324zM12 16c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm7.846-10.405a1.441 1.441 0 11-2.88 0 1.441 1.441 0 012.88 0z"/></svg></a>';
    if(sc.facebook) html += '<a class="social-link" href="' + esc(sc.facebook) + '" target="_blank" rel="noopener" title="Facebook"><svg viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a>';
    if(sc.x) html += '<a class="social-link" href="' + esc(sc.x) + '" target="_blank" rel="noopener" title="X (Twitter)"><svg viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg></a>';
    container.innerHTML = html;

    // Fill edit form
    pendingPfp = u.profilePic || null;
    document.getElementById('edit-first').value = u.firstName || '';
    document.getElementById('edit-last').value = u.lastName || '';
    document.getElementById('edit-rank').value = u.rank || '';
    document.getElementById('edit-bio').value = u.bio || '';
    document.getElementById('edit-linkedin').value = (u.social && u.social.linkedin) || '';
    document.getElementById('edit-instagram').value = (u.social && u.social.instagram) || '';
    document.getElementById('edit-facebook').value = (u.social && u.social.facebook) || '';
    document.getElementById('edit-x').value = (u.social && u.social.x) || '';
    updateBioCount();
    updatePfpPreview();
    var left = 3 - (u.editCount || 0);
    document.getElementById('editsLeft').textContent = left;

    document.getElementById('profileDisplay').style.display = 'block';
    document.getElementById('profileEdit').style.display = 'none';
    document.getElementById('btn-edit-toggle').textContent = 'Update Record';
  }

  function esc(s){ var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  window.toggleEdit = function(){
    if(!currentUser) return;
    var edits = currentUser.editCount || 0;
    if(edits >= 3){
      toast('Update authority exhausted. Submit formal dispatch via Secure Comms.', 'error');
      return;
    }
    var d = document.getElementById('profileDisplay');
    var e = document.getElementById('profileEdit');
    var btn = document.getElementById('btn-edit-toggle');
    var editing = e.style.display !== 'none';
    d.style.display = editing ? 'block' : 'none';
    e.style.display = editing ? 'none' : 'block';
    btn.textContent = editing ? 'Update Record' : 'Cancel';
    if(!editing) document.getElementById('editLockBanner').style.display = 'none';
  };

  window.saveProfile = function(){
    if(!currentUser) return;
    var edits = currentUser.editCount || 0;
    if(edits >= 3){
      toast('Update authority exhausted. Submit formal dispatch via Secure Comms.', 'error');
      return;
    }
    var newFirst = document.getElementById('edit-first').value.trim();
    var newLast = document.getElementById('edit-last').value.trim();
    if(!newFirst || !newLast){
      toast('Personnel name fields are required.', 'error');
      return;
    }
    currentUser.firstName = newFirst;
    currentUser.lastName = newLast;
    currentUser.rank = document.getElementById('edit-rank').value;
    currentUser.bio = document.getElementById('edit-bio').value.trim();
    currentUser.profilePic = pendingPfp || '';
    currentUser.editCount = edits + 1;
    currentUser.social = {
      linkedin: document.getElementById('edit-linkedin').value.trim(),
      instagram: document.getElementById('edit-instagram').value.trim(),
      facebook: document.getElementById('edit-facebook').value.trim(),
      x: document.getElementById('edit-x').value.trim()
    };
    Store.set('aditi_u_' + currentUser.email, currentUser);
    Store.set('aditi_session', currentUser);
    updateSidebarUser();
    loadProfile();
    var remaining = 3 - currentUser.editCount;
    if(remaining > 0){
      toast('Service record updated. ' + remaining + ' authorisation(s) remaining.', 'success');
    } else {
      toast('Service record updated. Update authority exhausted. Submit formal dispatch via Secure Comms.', 'success');
    }
  };

  /* ===== PROFILE PICTURE ===== */
  window.handlePfpUpload = function(e){
    var file = e.target.files[0];
    if(!file) return;
    if(file.size > 200 * 1024){
      toast('Image exceeds size limit. Maximum 200KB.', 'error');
      e.target.value = '';
      return;
    }
    if(!file.type.match(/^image\/(jpeg|png|webp|gif)$/)){
      toast('Invalid format. Accepted: JPG, PNG, or WebP.', 'error');
      e.target.value = '';
      return;
    }
    var reader = new FileReader();
    reader.onload = function(ev){
      pendingPfp = ev.target.result;
      updatePfpPreview();
    };
    reader.readAsDataURL(file);
  };

  window.removePfp = function(){
    pendingPfp = null;
    var fileInput = document.getElementById('edit-pfp');
    if(fileInput) fileInput.value = '';
    updatePfpPreview();
  };

  function updatePfpPreview(){
    var el = document.getElementById('pfp-preview');
    if(!el) return;
    if(pendingPfp){
      el.innerHTML = '<img src="' + pendingPfp + '" alt="Profile picture preview">';
    } else {
      el.innerHTML = '';
      if(currentUser) el.textContent = (currentUser.firstName[0] + currentUser.lastName[0]).toUpperCase();
      else el.textContent = '?';
    }
  }

  function updateBioCount(){
    var ta = document.getElementById('edit-bio');
    var c = document.getElementById('bio-count');
    if(ta && c) c.textContent = ta.value.length;
  }

  /* ===== CONTACT ===== */
  window.handleContact = function(e){
    e.preventDefault();
    var msg = {
      name: document.getElementById('contact-name').value.trim(),
      email: document.getElementById('contact-email').value.trim(),
      subject: document.getElementById('contact-subject').value,
      message: document.getElementById('contact-message').value.trim(),
      timestamp: new Date().toISOString(),
      id: Date.now()
    };
    var msgKey = 'aditi_messages_' + currentUser.id;
    var msgs = Store.get(msgKey) || [];
    msgs.push(msg);
    Store.set(msgKey, msgs);
    document.getElementById('contactForm').reset();
    renderMessages();
    toast('Dispatch transmitted and archived locally.', 'success');
  };

  function renderMessages(){
    var msgKey = currentUser ? 'aditi_messages_' + currentUser.id : 'aditi_messages';
    var msgs = Store.get(msgKey) || [];
    var el = document.getElementById('contact-messages');
    var ct = document.getElementById('msg-count');
    ct.textContent = msgs.length ? '(' + msgs.length + ')' : '';
    if(!msgs.length){ el.innerHTML = '<span style="color:var(--text-secondary)">No dispatches in archive.</span>'; return; }
    var html = '';
    var display = msgs.slice().reverse().slice(0, 5);
    for(var i = 0; i < display.length; i++){
      var m = display[i];
      html += '<div style="padding:8px 0;border-bottom:1px solid var(--border-subtle)">';
      html += '<div style="display:flex;justify-content:space-between;margin-bottom:2px">';
      html += '<strong style="font-size:12px;color:var(--text-primary)">' + esc(m.subject) + '</strong>';
      html += '<span style="font-size:11px;color:var(--text-secondary)">' + new Date(m.timestamp).toLocaleDateString() + '</span>';
      html += '</div>';
      html += '<div style="font-size:11px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(m.message) + '</div>';
      html += '</div>';
    }
    el.innerHTML = html;
  }

  /* ===== ONBOARDING ===== */
  var obSelectedMissions = [];

  window.obNext = function(){
    var phone = document.getElementById('ob-phone').value.trim();
    var loc = document.getElementById('ob-location').value;
    var regSelect = document.getElementById('ob-regiment');
    var regVal = regSelect ? regSelect.value : '';
    if(!phone){ toast('Official contact number is required.', 'error'); return; }
    if(!loc){ toast('Current posting assignment is required.', 'error'); return; }
    if(!regVal){ toast('Regiment affiliation is required.', 'error'); return; }

    // Save contact details + regiment
    currentUser.phone = phone;
    currentUser.location = loc;
    currentUser.regiment = regVal;
    var opt = regSelect.options[regSelect.selectedIndex];
    currentUser.warCry = (opt && opt.getAttribute('data-cry')) || 'Bharat Mata Ki Jai';
    currentUser.warCryTrans = (opt && opt.getAttribute('data-trans')) || 'Victory to Mother India';
    Store.set('aditi_u_' + currentUser.email, currentUser);
    Store.set('aditi_session', currentUser);

    // Switch to step 2
    document.getElementById('ob-step-1').classList.remove('active');
    document.getElementById('ob-step-2').classList.add('active');
    document.getElementById('ob-ind-1').classList.remove('active');
    document.getElementById('ob-ind-1').classList.add('done');
    document.getElementById('ob-line-1').classList.add('done');
    document.getElementById('ob-ind-2').classList.add('active');
  };

  window.obBack = function(){
    document.getElementById('ob-step-2').classList.remove('active');
    document.getElementById('ob-step-1').classList.add('active');
    document.getElementById('ob-ind-2').classList.remove('active');
    document.getElementById('ob-line-1').classList.remove('done');
    document.getElementById('ob-ind-1').classList.remove('done');
    document.getElementById('ob-ind-1').classList.add('active');
  };

  window.obFinish = function(){
    currentUser.missions = obSelectedMissions.slice();
    currentUser.onboarded = true;
    Store.set('aditi_u_' + currentUser.email, currentUser);
    Store.set('aditi_session', currentUser);
    obSelectedMissions = [];
    showLoadingShell(function(){
      toast('Initialization complete. Command Center now operational. Duty first. Jai Hind.', 'success');
      showAppShell();
    });
  };

  function initMissionGrid(){
    var cards = document.querySelectorAll('.mission-card');
    for(var i = 0; i < cards.length; i++){
      cards[i].addEventListener('click', function(){
        var mission = this.getAttribute('data-mission');
        var idx = obSelectedMissions.indexOf(mission);
        if(idx > -1){
          obSelectedMissions.splice(idx, 1);
          this.classList.remove('selected');
        } else {
          obSelectedMissions.push(mission);
          this.classList.add('selected');
        }
        var ct = document.getElementById('obSelCount');
        if(ct) ct.textContent = obSelectedMissions.length + ' deployment' + (obSelectedMissions.length !== 1 ? 's' : '') + ' selected';
      });
    }
  }

  /* ===== THEME ===== */
  window.toggleTheme = function(){
    var html = document.documentElement;
    var current = html.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('aditi_theme', next);
    syncThemeIcons(next);
  };

  function syncThemeIcons(theme){
    var svg = theme === 'dark' ? MOON_SVG : SUN_SVG;
    var pub = document.getElementById('pubThemeToggle');
    var app = document.getElementById('appThemeToggle');
    var ob = document.getElementById('obThemeToggle');
    if(pub) pub.innerHTML = svg;
    if(app) app.innerHTML = svg;
    if(ob) ob.innerHTML = svg;
  }

  function applyTheme(){
    var saved = localStorage.getItem('aditi_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    syncThemeIcons(saved);
  }

  /* ===== INIT ===== */
  function init(){
    applyTheme();

    // Check for existing session
    var session = Store.get('aditi_session');
    if(session){
      var verified = Store.get('aditi_u_' + session.email);
      if(verified){
        currentUser = verified;
        if(!currentUser.onboarded){
          showOnboardingShell();
        } else {
          showAppShell();
        }
      } else {
        Store.del('aditi_session');
        showPublicShell();
      }
    } else {
      showPublicShell();
    }

    // Bio counter
    var bioTA = document.getElementById('edit-bio');
    if(bioTA) bioTA.addEventListener('input', updateBioCount);

    // Init mission card listeners (only once on DOMContentLoaded)
    initMissionGrid();
  }

  /* ===== WAR CRY PREVIEW ===== */
  window.previewWarCry = function(){
    var sel = document.getElementById('ob-regiment');
    var preview = document.getElementById('ob-cry-preview');
    if(!sel || !preview) return;
    var opt = sel.options[sel.selectedIndex];
    if(opt && opt.getAttribute('data-cry')){
      preview.innerHTML = '<em style="color:var(--gold)">' + esc(opt.getAttribute('data-cry')) + '</em> <span style="color:var(--text-tertiary)">(' + esc(opt.getAttribute('data-trans')) + ')</span>';
    } else {
      preview.innerHTML = '';
    }
  };

  document.addEventListener('DOMContentLoaded', init);

})();
