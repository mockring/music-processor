// DOM Elements
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

// License elements
const headerStatusIcon = document.getElementById('header-status-icon');
const headerStatusText = document.getElementById('header-status-text');
const licenseToggleBtn = document.getElementById('license-toggle-btn');
const licenseIcon = document.getElementById('license-icon');
const licenseDesc = document.getElementById('license-desc');
const serialForm = document.getElementById('serial-form');
const serialSection = document.getElementById('serial-section');
const serialInput = document.getElementById('serial-input');
const serialActivateBtn = document.getElementById('serial-activate-btn');
const serialError = document.getElementById('serial-error');
const trialSection = document.getElementById('trial-section');
const trialStartBtn = document.getElementById('trial-start-btn');
const activationSuccess = document.getElementById('activation-success');
const activatedSerial = document.getElementById('activated-serial');
const deactivateSection = document.getElementById('deactivate-section');
const deactivateBtn = document.getElementById('deactivate-btn');

// Input elements
const selectFileBtn = document.getElementById('select-file-btn');
const inputHint = document.getElementById('input-hint');

// Multi-stem checkboxes
const multiStemCheckboxes = document.querySelectorAll('.stem-checkbox');

let isProcessing = false;
let currentOutputPath = '';
let customOutputFolder = null;
let selectedLocalFile = null;
let currentLicense = null; // { mode: 'serial'|'trial'|'none', valid: bool, ... }

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
  if (!currentLicense || !currentLicense.valid) {
    return false;
  }
  const input = urlInput.value.trim();
  if (input.length > 0) return true;
  if (selectedLocalFile) return true;
  return false;
}

function formatTimeRemaining(ms) {
  if (ms <= 0) return '已過期';
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}小時${mins}分`;
  }
  return `${minutes}分${seconds}秒`;
}

function updateLicenseUI() {
  if (!currentLicense) {
    licenseIcon.innerHTML = '&#128274;';
    licenseDesc.textContent = '載入中...';
    headerStatusIcon.innerHTML = '&#128274;';
    headerStatusText.textContent = '載入中...';
    return;
  }

  if (currentLicense.mode === 'serial') {
    licenseIcon.innerHTML = '&#128275;';
    licenseDesc.textContent = '已啟用序號';
    licenseDesc.className = 'license-desc activated';
    headerStatusIcon.innerHTML = '&#128275;';
    headerStatusText.textContent = '已啟用';
  } else if (currentLicense.mode === 'trial') {
    const remaining = formatTimeRemaining(currentLicense.remainingTime);
    licenseIcon.innerHTML = '&#128275;';
    licenseDesc.textContent = `試用中 (${remaining})`;
    licenseDesc.className = 'license-desc trial';
    headerStatusIcon.innerHTML = '&#128275;';
    headerStatusText.textContent = `試用中 (${remaining})`;
  } else {
    licenseIcon.innerHTML = '&#128274;';
    licenseDesc.textContent = currentLicense.error || '未啟用';
    licenseDesc.className = 'license-desc expired';
    headerStatusIcon.innerHTML = '&#128274;';
    headerStatusText.textContent = '未啟用';
  }

  updateProcessButton();
}

function updateProcessButton() {
  const input = urlInput.value.trim();
  const hasInput = input.length > 0;
  const hasLocalFile = selectedLocalFile !== null;
  const isUrlInput = isUrl(input);

  processBtn.disabled = !canProcess() || isProcessing;

  if (!currentLicense || !currentLicense.valid) {
    processBtnText.textContent = '請先啟用';
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

processBtn.addEventListener('click', async () => {
  if (isProcessing) return;

  if (!currentLicense || !currentLicense.valid) {
    alert('請先啟用軟體');
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
    options.localFile = input;
    options.localFileName = input.split(/[\\/]/).pop();
  } else if (selectedLocalFile) {
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

// License section toggle
licenseToggleBtn.addEventListener('click', () => {
  const isHidden = serialForm.classList.contains('hidden');
  if (isHidden) {
    serialForm.classList.remove('hidden');
    licenseToggleBtn.textContent = '關閉';
    checkLicense();
  } else {
    serialForm.classList.add('hidden');
    licenseToggleBtn.textContent = '啟用';
  }
});

// Serial activation
serialActivateBtn.addEventListener('click', async () => {
  const serialKey = serialInput.value.trim().toUpperCase();

  if (!serialKey) {
    serialError.textContent = '請輸入序號';
    serialError.classList.remove('hidden');
    return;
  }

  serialActivateBtn.disabled = true;
  serialActivateBtn.textContent = '啟用中...';
  serialError.classList.add('hidden');

  try {
    const result = await window.api.activateLicense(serialKey);

    if (result.success) {
      activationSuccess.classList.remove('hidden');
      serialSection.classList.add('hidden');
      trialSection.classList.add('hidden');
      deactivateSection.classList.remove('hidden');
      activatedSerial.textContent = `序號: ${serialKey}`;
      updateLog('序號啟用成功');
      await checkLicense();
    } else {
      serialError.textContent = result.error || '啟用失敗';
      serialError.classList.remove('hidden');
      updateLog('序號啟用失敗: ' + (result.error || '未知錯誤'));
    }
  } catch (e) {
    serialError.textContent = '啟用失敗: ' + e.message;
    serialError.classList.remove('hidden');
    updateLog('序號啟用錯誤: ' + e.message);
  }

  serialActivateBtn.disabled = false;
  serialActivateBtn.textContent = '啟用';
});

// Trial start
trialStartBtn.addEventListener('click', async () => {
  trialStartBtn.disabled = true;
  trialStartBtn.textContent = '啟動中...';

  try {
    const result = await window.api.startTrial();

    if (result.success) {
      updateLog('試用期已開始 (1小時)');
      await checkLicense();
      licenseForm.classList.add('hidden');
      licenseToggleBtn.textContent = '啟用';
    } else {
      updateLog('試用期啟動失敗: ' + (result.error || '未知錯誤'));
    }
  } catch (e) {
    updateLog('試用期啟動錯誤: ' + e.message);
  }

  trialStartBtn.disabled = false;
  trialStartBtn.textContent = '開始試用';
});

// Deactivate
deactivateBtn.addEventListener('click', async () => {
  if (!confirm('確定要取消授權嗎？')) return;

  try {
    const result = await window.api.deactivateLicense();

    if (result.success) {
      updateLog('已取消授權');
      serialInput.value = '';
      activationSuccess.classList.add('hidden');
      serialSection.classList.remove('hidden');
      trialSection.classList.remove('hidden');
      deactivateSection.classList.add('hidden');
      await checkLicense();
    } else {
      updateLog('取消授權失敗: ' + (result.error || '未知錯誤'));
    }
  } catch (e) {
    updateLog('取消授權錯誤: ' + e.message);
  }
});

// About section
const aboutToggle = document.getElementById('about-toggle');
const aboutArrow = document.getElementById('about-arrow');
const aboutContent = document.getElementById('about-content');

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

document.getElementById('open-license-btn').addEventListener('click', () => {
  window.api.openLicenseFile();
  updateLog('已開啟授權檔案');
});

// Check license status
async function checkLicense() {
  try {
    currentLicense = await window.api.getLicenseStatus();
    updateLicenseUI();

    // Show/hide appropriate sections based on license state
    if (currentLicense.mode === 'serial') {
      activationSuccess.classList.remove('hidden');
      serialSection.classList.add('hidden');
      trialSection.classList.add('hidden');
      deactivateSection.classList.remove('hidden');
      activatedSerial.textContent = `序號: ${currentLicense.serialKey}`;
    } else if (currentLicense.mode === 'trial') {
      activationSuccess.classList.add('hidden');
      serialSection.classList.remove('hidden');
      trialSection.classList.add('hidden'); // Hide trial button once started
      deactivateSection.classList.remove('hidden');
    } else {
      activationSuccess.classList.add('hidden');
      serialSection.classList.remove('hidden');
      trialSection.classList.remove('hidden');
      deactivateSection.classList.add('hidden');
    }
  } catch (e) {
    console.error('Failed to check license:', e);
    currentLicense = { mode: 'none', valid: false, error: '檢查授權失敗' };
    updateLicenseUI();
  }
}

// Initialize
checkLicense();