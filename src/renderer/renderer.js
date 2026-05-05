const urlInput = document.getElementById('url-input');
const pasteBtn = document.getElementById('paste-btn');
const urlError = document.getElementById('url-error');
const pitchSlider = document.getElementById('pitch-slider');
const pitchDisplay = document.getElementById('pitch-display');
const vocalToggle = document.getElementById('vocal-toggle');
const vocalStatus = document.getElementById('vocal-status');
const processBtn = document.getElementById('process-btn');
const processBtnText = document.getElementById('process-btn-text');
const progressSection = document.getElementById('progress-section');
const progressFill = document.getElementById('progress-fill');
const progressPercent = document.getElementById('progress-percent');
const statusText = document.getElementById('status-text');
const outputSection = document.getElementById('output-section');
const outputTitle = document.getElementById('output-title');
const outputPath = document.getElementById('output-path');
const openFolderBtn = document.getElementById('open-folder-btn');
const logText = document.getElementById('log-text');
const outputFolderPath = document.getElementById('output-folder-path');
const selectFolderBtn = document.getElementById('select-folder-btn');
const aboutToggle = document.getElementById('about-toggle');
const aboutArrow = document.getElementById('about-arrow');
const aboutContent = document.getElementById('about-content');
const openLicenseBtn = document.getElementById('open-license-btn');

// Auth elements
const authSection = document.getElementById('auth-section');
const authForm = document.getElementById('auth-form');
const authUser = document.getElementById('auth-user');
const authEmailInput = document.getElementById('auth-email');
const authPasswordInput = document.getElementById('auth-password');
const authRememberEmail = document.getElementById('auth-remember-email');
const authLoginBtn = document.getElementById('auth-login-btn');
const authRegisterBtn = document.getElementById('auth-register-btn');
const authUserEmail = document.getElementById('auth-user-email');
const authSubscriptionStatus = document.getElementById('auth-subscription-status');
const authLogoutBtn = document.getElementById('auth-logout-btn');

// License/Subscription elements
const licenseToggleBtn = document.getElementById('license-toggle-btn');
const licenseForm = document.getElementById('license-form');
const licenseDesc = document.getElementById('license-desc');
const licenseIcon = document.getElementById('license-icon');
const subscriptionPlans = document.getElementById('subscription-plans');
const devicesSection = document.getElementById('devices-section');
const devicesList = document.getElementById('devices-list');

// Input elements
const selectFileBtn = document.getElementById('select-file-btn');
const inputHint = document.getElementById('input-hint');

// Multi-stem checkboxes
const multiStemCheckboxes = document.querySelectorAll('.stem-checkbox');

let isProcessing = false;
let currentOutputPath = '';
let customOutputFolder = null;
let selectedLocalFile = null;
let currentUser = null;
let currentSubscription = null;

function updateLog(message) {
  const now = new Date();
  const time = now.toLocaleTimeString('zh-TW', { hour12: false });
  logText.textContent = `[${time}] ${message}`;
}

function isUrl(input) {
  const trimmed = input.trim();
  return trimmed.startsWith('http://') || trimmed.startsWith('https://');
}

function getSelectedFormat() {
  return document.querySelector('input[name="format"]:checked').value;
}

function getSelectedBitrate() {
  return parseInt(document.querySelector('input[name="bitrate"]:checked').value);
}

function getSelectedStems() {
  const stems = [];
  multiStemCheckboxes.forEach(cb => {
    if (cb.checked) {
      stems.push(cb.value);
    }
  });
  return stems;
}

function isMultiStemEnabled() {
  return getSelectedStems().length > 0;
}

function canProcess() {
  if (!currentSubscription || !currentSubscription.valid) {
    return false;
  }
  const input = urlInput.value.trim();
  if (input.length > 0) return true;
  if (selectedLocalFile) return true;
  return false;
}

function updateProcessButton() {
  const input = urlInput.value.trim();
  const hasInput = input.length > 0;
  const hasLocalFile = selectedLocalFile !== null;
  const isUrlInput = isUrl(input);

  processBtn.disabled = !canProcess() || isProcessing;

  if (!currentSubscription || !currentSubscription.valid) {
    processBtnText.textContent = '請先登入訂閱';
  } else if (hasInput && isUrlInput) {
    processBtnText.textContent = '下載並處理';
  } else if (hasInput && !isUrlInput) {
    processBtnText.textContent = '處理音訊';
  } else if (hasLocalFile) {
    processBtnText.textContent = '處理音訊';
  } else {
    processBtnText.textContent = '請輸入網址或選擇檔案';
  }

  // Update hint text
  if (hasInput) {
    if (isUrlInput) {
      inputHint.textContent = '已偵測為 YouTube 網址';
      inputHint.classList.remove('hint-error');
    } else {
      inputHint.textContent = '已偵測為本地檔案路徑';
      inputHint.classList.remove('hint-error');
    }
  } else if (hasLocalFile) {
    inputHint.textContent = '已選擇本地檔案';
    inputHint.classList.remove('hint-error');
  } else {
    inputHint.textContent = '自動判斷網址或本地檔案';
    inputHint.classList.remove('hint-error');
  }
}

function validateUrl() {
  const url = urlInput.value.trim();
  if (!url) {
    urlError.classList.add('hidden');
    updateProcessButton();
    return false;
  }

  window.api.validateUrl(url).then(result => {
    if (result.valid) {
      urlError.classList.add('hidden');
      updateProcessButton();
    } else {
      urlError.textContent = result.error;
      urlError.classList.remove('hidden');
      processBtn.disabled = true;
    }
  });

  return true;
}

urlInput.addEventListener('input', () => {
  updateProcessButton();
});

pasteBtn.addEventListener('click', async () => {
  const text = await window.api.pasteFromClipboard();
  urlInput.value = text;
  updateProcessButton();
  const input = urlInput.value.trim();
  if (isUrl(input)) {
    updateLog('已從剪貼簿貼上網址');
  } else {
    updateLog('已從剪貼簿貼上路徑');
  }
});

selectFileBtn.addEventListener('click', async () => {
  const file = await window.api.selectLocalFile();
  if (file) {
    selectedLocalFile = file.path;
    urlInput.value = file.path;
    updateProcessButton();
    updateLog(`已選擇檔案: ${file.name}`);
  }
});

pitchSlider.addEventListener('input', () => {
  const value = parseInt(pitchSlider.value);
  pitchDisplay.textContent = value >= 0 ? `+${value}` : value;
});

vocalToggle.addEventListener('change', () => {
  vocalStatus.textContent = vocalToggle.checked ? '開啟' : '關閉';
  vocalStatus.style.color = vocalToggle.checked ? '#e94560' : '';
});

// Initialize vocal toggle state (default to ON)
vocalStatus.textContent = '開啟';
vocalStatus.style.color = '#e94560';

processBtn.addEventListener('click', async () => {
  if (isProcessing) return;

  if (!currentSubscription || !currentSubscription.valid) {
    alert('請先登入並訂閱後再使用');
    return;
  }

  const options = {
    pitch: parseInt(pitchSlider.value),
    removeVocal: vocalToggle.checked,
    outputFolder: customOutputFolder,
    format: getSelectedFormat(),
    bitrate: getSelectedBitrate(),
    multiStem: isMultiStemEnabled(),
    stems: getSelectedStems()
  };

  const input = urlInput.value.trim();

  // Auto-detect: URL or local file
  if (input.length > 0 && isUrl(input)) {
    // URL mode
    const validation = await window.api.validateUrl(input);
    if (!validation.valid) {
      urlError.textContent = validation.error;
      urlError.classList.remove('hidden');
      inputHint.textContent = '無效的網址';
      inputHint.classList.add('hint-error');
      return;
    }
    options.url = input;
  } else if (input.length > 0) {
    // Local file path mode
    options.localFile = input;
    options.localFileName = input.split(/[\\/]/).pop();
  } else if (selectedLocalFile) {
    // File picker selected
    options.localFile = selectedLocalFile;
    options.localFileName = selectedLocalFile.split(/[\\/]/).pop();
  } else {
    urlError.textContent = '請輸入網址或選擇音訊檔案';
    urlError.classList.remove('hidden');
    return;
  }

  isProcessing = true;
  processBtn.disabled = true;
  processBtnText.textContent = '處理中...';
  progressSection.classList.remove('hidden');
  outputSection.classList.add('hidden');
  progressFill.style.width = '0%';
  progressPercent.textContent = '0%';
  statusText.textContent = '準備中...';
  updateLog('開始處理');

  window.api.process(options).then(result => {
    isProcessing = false;
    processBtn.disabled = false;
    updateProcessButton();

    if (result.success) {
      currentOutputPath = result.filePath;
      progressFill.style.width = '100%';
      progressPercent.textContent = '100%';
      statusText.textContent = '完成！';
      outputPath.textContent = result.filePath;
      outputSection.classList.remove('hidden');
      updateLog('處理完成');
    } else {
      statusText.textContent = `錯誤: ${result.error}`;
      statusText.style.color = '#ff6b6b';
      updateLog(`錯誤: ${result.error}`);
      setTimeout(() => {
        statusText.style.color = '';
      }, 3000);
    }
  });
});

openFolderBtn.addEventListener('click', () => {
  if (currentOutputPath) {
    window.api.openFolder(currentOutputPath);
    updateLog('已開啟輸出資料夾');
  }
});

selectFolderBtn.addEventListener('click', async () => {
  const folder = await window.api.selectOutputFolder();
  if (folder) {
    customOutputFolder = folder;
    outputFolderPath.textContent = folder;
    updateLog(`輸出資料夾已更改: ${folder}`);
  }
});

window.api.onProgress((data) => {
  progressFill.style.width = `${data.percent}%`;
  progressPercent.textContent = `${data.percent}%`;
  statusText.textContent = data.stage;
  updateLog(`進度: ${data.stage} (${data.percent}%)`);
});

async function initOutputFolder() {
  const defaultPath = await window.api.getOutputPath();
  outputFolderPath.textContent = defaultPath;
}

initOutputFolder();
updateLog('程式就緒');

// Advanced section toggle
const advancedToggle = document.getElementById('advanced-toggle');
const advancedArrow = document.getElementById('advanced-arrow');
const advancedContent = document.getElementById('advanced-content');

advancedToggle.addEventListener('click', () => {
  const isHidden = advancedContent.classList.contains('hidden');
  if (isHidden) {
    advancedContent.classList.remove('hidden');
    advancedToggle.classList.add('expanded');
  } else {
    advancedContent.classList.add('hidden');
    advancedToggle.classList.remove('expanded');
  }
});

// About / License section
aboutToggle.addEventListener('click', () => {
  const isHidden = aboutContent.classList.contains('hidden');
  if (isHidden) {
    aboutContent.classList.remove('hidden');
    aboutToggle.classList.add('expanded');
  } else {
    aboutContent.classList.add('hidden');
    aboutToggle.classList.remove('expanded');
  }
});

openLicenseBtn.addEventListener('click', () => {
  window.api.openLicenseFile();
  updateLog('已開啟授權檔案');
});

// Auth functions
async function updateAuthUI() {
  const isLoggedIn = await window.api.authIsLoggedIn();

  if (isLoggedIn) {
    authForm.classList.add('hidden');
    authUser.classList.remove('hidden');
    const user = await window.api.authGetUser();
    if (user) {
      currentUser = user;
      authUserEmail.textContent = user.email;
    }
  } else {
    authForm.classList.remove('hidden');
    authUser.classList.add('hidden');
    currentUser = null;
  }
}

async function checkSubscription() {
  try {
    const result = await window.api.authCheckSubscription();
    currentSubscription = result;
    updateSubscriptionUI();
    updateProcessButton();
  } catch (e) {
    console.error('Failed to check subscription:', e);
    currentSubscription = { valid: false };
    updateProcessButton();
  }
}

function updateSubscriptionUI() {
  if (!currentSubscription) {
    licenseIcon.innerHTML = '&#128274;';
    licenseDesc.textContent = '未登入';
    licenseDesc.className = 'license-desc';
    return;
  }

  if (currentSubscription.valid) {
    licenseIcon.innerHTML = '&#128275;';
    licenseDesc.textContent = `已訂閱 (${currentSubscription.plan || 'active'})`;
    licenseDesc.className = 'license-desc activated';
  } else {
    licenseIcon.innerHTML = '&#128274;';
    licenseDesc.textContent = currentSubscription.error === 'NOT_LOGGED_IN' ? '請先登入' : '未訂閱';
    licenseDesc.className = 'license-desc expired';
  }
}

async function loadDevices() {
  try {
    const devices = await window.api.authGetDevices();
    devicesList.innerHTML = '';
    if (devices && devices.length > 0) {
      devices.forEach(device => {
        const div = document.createElement('div');
        div.className = 'device-item';
        div.innerHTML = `
          <span>${device.name || device.machineId}</span>
          <button class="btn btn-small btn-remove-device" data-id="${device.id}">移除</button>
        `;
        devicesList.appendChild(div);
      });
      devicesSection.classList.remove('hidden');
    } else {
      devicesSection.classList.add('hidden');
    }
  } catch (e) {
    console.error('Failed to load devices:', e);
    devicesSection.classList.add('hidden');
  }
}

async function loadSubscriptionPlans() {
  try {
    const result = await window.api.authGetSubscriptionPlans();
    if (result.success && result.data) {
      // Plans are shown in HTML, just log success
      updateLog('已載入訂閱方案');
    }
  } catch (e) {
    console.error('Failed to load subscription plans:', e);
  }
}

// Auth event listeners
authLoginBtn.addEventListener('click', async () => {
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;

  if (!email || !password) {
    alert('請輸入電子郵件和密碼');
    return;
  }

  authLoginBtn.disabled = true;
  authLoginBtn.textContent = '登入中...';
  authEmailInput.style.opacity = '0.7';
  authPasswordInput.style.opacity = '0.7';

  try {
    const result = await window.api.authLogin(email, password);
    if (result.success) {
      updateLog('登入成功');
      await updateAuthUI();
      await checkSubscription();
      await loadDevices();
      authPasswordInput.value = '';
      if (authRememberEmail.checked) {
        updateLog('儲存記住的帳號: ' + email);
        await window.api.authSaveRememberedEmail(email);
      } else {
        updateLog('清除記住的帳號');
        await window.api.authClearRememberedEmail();
      }
    } else {
      alert(result.error?.message || '登入失敗');
    }
  } catch (e) {
    updateLog('登入錯誤: ' + e.message);
    console.error('Login error details:', e);
    alert('登入失敗: ' + e.message + '\n\n詳細資訊：\n' + (e.stack || e.description || '無'));
  }

  authLoginBtn.disabled = false;
  authLoginBtn.textContent = '登入';
  authEmailInput.style.opacity = '1';
  authPasswordInput.style.opacity = '1';
});

authRegisterBtn.addEventListener('click', async () => {
  const email = authEmailInput.value.trim();
  const password = authPasswordInput.value;

  if (!email || !password) {
    alert('請輸入電子郵件和密碼');
    return;
  }

  if (password.length < 6) {
    alert('密碼至少需要 6 個字元');
    return;
  }

  authRegisterBtn.disabled = true;
  authRegisterBtn.textContent = '註冊中...';
  authEmailInput.style.opacity = '0.7';
  authPasswordInput.style.opacity = '0.7';

  try {
    const result = await window.api.authRegister(email, password);
    if (result.success) {
      updateLog('註冊成功');
      await updateAuthUI();
      await checkSubscription();
      authPasswordInput.value = '';
    } else {
      alert(result.error?.message || '註冊失敗');
    }
  } catch (e) {
    alert('註冊失敗: ' + e.message);
  }

  authRegisterBtn.disabled = false;
  authRegisterBtn.textContent = '註冊';
  authEmailInput.style.opacity = '1';
  authPasswordInput.style.opacity = '1';
});

authLogoutBtn.addEventListener('click', async () => {
  try {
    await window.api.authLogout();
    currentUser = null;
    currentSubscription = { valid: false };
    updateLog('已登出');
    await updateAuthUI();
    updateSubscriptionUI();
    updateProcessButton();
  } catch (e) {
    console.error('Logout error:', e);
  }
});

// License/Subscription section
licenseToggleBtn.addEventListener('click', () => {
  const isHidden = licenseForm.classList.contains('hidden');
  if (isHidden) {
    licenseForm.classList.remove('hidden');
    licenseToggleBtn.textContent = '關閉';
    loadSubscriptionPlans();
    loadDevices();
  } else {
    licenseForm.classList.add('hidden');
    licenseToggleBtn.textContent = '訂閱方案';
  }
});

// Delegate click for remove device buttons
devicesList.addEventListener('click', async (e) => {
  if (e.target.classList.contains('btn-remove-device')) {
    const deviceId = e.target.dataset.id;
    if (confirm('確定要移除這個裝置嗎？')) {
      try {
        await window.api.authRemoveDevice(deviceId);
        await loadDevices();
        updateLog('已移除裝置');
      } catch (e) {
        alert('移除裝置失敗');
      }
    }
  }
});

// Initialize auth state
async function initAuth() {
  await updateAuthUI();
  await checkSubscription();
  // Load remembered email
  const rememberedEmail = await window.api.authGetRememberedEmail();
  updateLog('載入記住的帳號: ' + (rememberedEmail || '無'));
  if (rememberedEmail) {
    authEmailInput.value = rememberedEmail;
    authRememberEmail.checked = true;
    updateLog('已填入記住的帳號: ' + rememberedEmail);
  }
}

initAuth();