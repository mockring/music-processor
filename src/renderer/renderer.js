const urlInput = document.getElementById('url-input');
const pasteBtn = document.getElementById('paste-btn');
const urlError = document.getElementById('url-error');
const fileError = document.getElementById('file-error');
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

// License elements
const licenseToggleBtn = document.getElementById('license-toggle-btn');
const licenseForm = document.getElementById('license-form');
const licenseKeyInput = document.getElementById('license-key-input');
const licenseActivateBtn = document.getElementById('license-activate-btn');
const licenseDeactivateBtn = document.getElementById('license-deactivate-btn');
const licenseError = document.getElementById('license-error');
const licenseDesc = document.getElementById('license-desc');
const licenseIcon = document.getElementById('license-icon');

// Input mode tabs
const tabUrl = document.getElementById('tab-url');
const tabLocal = document.getElementById('tab-local');
const urlInputContent = document.getElementById('url-input-content');
const localInputContent = document.getElementById('local-input-content');
const localFileName = document.getElementById('local-file-name');
const selectFileBtn = document.getElementById('select-file-btn');

// Multi-stem checkboxes
const multiStemCheckboxes = document.querySelectorAll('.stem-checkbox');

let isProcessing = false;
let currentOutputPath = '';
let customOutputFolder = null;
let selectedLocalFile = null;
let inputMode = 'url'; // 'url' or 'local'

function updateLog(message) {
  const now = new Date();
  const time = now.toLocaleTimeString('zh-TW', { hour12: false });
  logText.textContent = `[${time}] ${message}`;
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
  if (inputMode === 'url') {
    return urlInput.value.trim().length > 0;
  } else {
    return selectedLocalFile !== null;
  }
}

function updateProcessButton() {
  processBtn.disabled = !canProcess() || isProcessing;

  if (inputMode === 'url') {
    processBtnText.textContent = '下載並處理';
  } else {
    processBtnText.textContent = '處理音訊';
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
  validateUrl();
});

pasteBtn.addEventListener('click', async () => {
  const text = await window.api.pasteFromClipboard();
  urlInput.value = text;
  validateUrl();
  updateLog('已從剪貼簿貼上網址');
});

// Input mode tabs
tabUrl.addEventListener('click', () => {
  inputMode = 'url';
  tabUrl.classList.add('active');
  tabLocal.classList.remove('active');
  urlInputContent.classList.remove('hidden');
  localInputContent.classList.add('hidden');
  fileError.classList.add('hidden');
  updateProcessButton();
});

tabLocal.addEventListener('click', () => {
  inputMode = 'local';
  tabUrl.classList.remove('active');
  tabLocal.classList.add('active');
  urlInputContent.classList.add('hidden');
  localInputContent.classList.remove('hidden');
  urlError.classList.add('hidden');
  updateProcessButton();
});

selectFileBtn.addEventListener('click', async () => {
  const file = await window.api.selectLocalFile();
  if (file) {
    selectedLocalFile = file.path;
    localFileName.textContent = file.name;
    localFileName.classList.add('has-file');
    fileError.classList.add('hidden');
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

processBtn.addEventListener('click', async () => {
  if (isProcessing) return;

  const options = {
    pitch: parseInt(pitchSlider.value),
    removeVocal: vocalToggle.checked,
    outputFolder: customOutputFolder,
    format: getSelectedFormat(),
    bitrate: getSelectedBitrate(),
    multiStem: isMultiStemEnabled(),
    stems: getSelectedStems()
  };

  if (inputMode === 'url') {
    const url = urlInput.value.trim();
    const validation = await window.api.validateUrl(url);

    if (!validation.valid) {
      urlError.textContent = validation.error;
      urlError.classList.remove('hidden');
      return;
    }

    options.url = url;
  } else {
    if (!selectedLocalFile) {
      fileError.textContent = '請選擇音訊檔案';
      fileError.classList.remove('hidden');
      return;
    }
    options.localFile = selectedLocalFile;
    options.localFileName = localFileName.textContent;
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
    processBtnText.textContent = inputMode === 'url' ? '下載並處理' : '處理音訊';

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

// License Section
licenseToggleBtn.addEventListener('click', () => {
  const isHidden = licenseForm.classList.contains('hidden');
  if (isHidden) {
    licenseForm.classList.remove('hidden');
    licenseToggleBtn.textContent = '關閉';
  } else {
    licenseForm.classList.add('hidden');
    licenseToggleBtn.textContent = '啟用授權';
    licenseError.classList.add('hidden');
  }
});

// Format license key input (auto-add dashes)
licenseKeyInput.addEventListener('input', (e) => {
  let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (value.length > 4) {
    value = value.substring(0, 4) + '-' + value.substring(4);
  }
  if (value.length > 9) {
    value = value.substring(0, 9) + '-' + value.substring(9);
  }
  if (value.length > 14) {
    value = value.substring(0, 14) + '-' + value.substring(14);
  }
  if (value.length > 19) {
    value = value.substring(0, 19);
  }
  e.target.value = value;
});

licenseActivateBtn.addEventListener('click', async () => {
  const key = licenseKeyInput.value.trim();
  if (!key) {
    licenseError.textContent = '請輸入授權碼';
    licenseError.classList.remove('hidden');
    return;
  }

  licenseActivateBtn.disabled = true;
  licenseActivateBtn.textContent = '驗證中...';

  try {
    const result = await window.api.activateLicense(key);
    if (result.valid) {
      licenseError.classList.add('hidden');
      licenseKeyInput.value = '';
      licenseForm.classList.add('hidden');
      licenseToggleBtn.textContent = '授權已啟用';
      updateLicenseUI(result);
      updateLog('授權啟用成功');
    } else {
      licenseError.textContent = result.error;
      licenseError.classList.remove('hidden');
    }
  } catch (e) {
    licenseError.textContent = '授權驗證失敗';
    licenseError.classList.remove('hidden');
  }

  licenseActivateBtn.disabled = false;
  licenseActivateBtn.textContent = '啟用';
});

licenseDeactivateBtn.addEventListener('click', async () => {
  if (!confirm('確定要停用授權嗎？停用後將恢復試用期。')) {
    return;
  }

  try {
    const result = await window.api.deactivateLicense();
    if (result.success) {
      initLicenseStatus();
      updateLog('授權已停用');
    }
  } catch (e) {
    licenseError.textContent = '停用授權失敗';
    licenseError.classList.remove('hidden');
  }
});

function updateLicenseUI(status) {
  if (status.activated && status.valid) {
    licenseIcon.innerHTML = '&#128275;'; // unlocked
    licenseDesc.textContent = '已授權';
    licenseDesc.className = 'license-desc activated';
    licenseToggleBtn.textContent = '已啟用';
    licenseToggleBtn.disabled = true;
  } else if (status.trial && status.valid) {
    licenseIcon.innerHTML = '&#128274;'; // locked
    if (status.trialDays > 0) {
      licenseDesc.textContent = `試用中 (剩餘 ${status.trialDays} 天)`;
      licenseDesc.className = 'license-desc trial';
    } else {
      licenseDesc.textContent = '試用期已到，請輸入授權碼';
      licenseDesc.className = 'license-desc expired';
    }
    licenseToggleBtn.textContent = '啟用授權';
    licenseToggleBtn.disabled = false;
  } else if (!status.valid) {
    licenseIcon.innerHTML = '&#128275;';
    licenseDesc.textContent = '授權無效或已過期';
    licenseDesc.className = 'license-desc expired';
    licenseToggleBtn.textContent = '啟用授權';
    licenseToggleBtn.disabled = false;
  } else {
    licenseIcon.innerHTML = '&#128274;';
    licenseDesc.textContent = '試用中';
    licenseDesc.className = 'license-desc trial';
    licenseToggleBtn.textContent = '啟用授權';
    licenseToggleBtn.disabled = false;
  }
}

async function initLicenseStatus() {
  try {
    const status = await window.api.getLicenseStatus();
    updateLicenseUI(status);
  } catch (e) {
    console.error('Failed to get license status:', e);
  }
}

initLicenseStatus();