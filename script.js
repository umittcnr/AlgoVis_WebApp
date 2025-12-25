/**
 * --------------------------------------------------------------------------
 * ALGOVIS PRO v7.0 - ULTIMATE EDITION
 * Features: Sound FX, Manual Input, Step Execution, Dynamic Math
 * --------------------------------------------------------------------------
 */

// --- AUDIO ENGINE (SES MOTORU) ---
class AudioEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.enabled = true;
    }

    playTone(freq, type = 'sine', duration = 0.1) {
        if (!this.enabled) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = type;
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        
        gain.gain.setValueAtTime(0.05, this.ctx.currentTime); // Volume
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start();
        osc.stop(this.ctx.currentTime + duration);
    }

    playCompare() { this.playTone(400, 'sine', 0.1); } // İnce bip
    playFound() { this.playTone(880, 'square', 0.2); } // Yüksek başarı sesi
    playEliminate() { this.playTone(150, 'sawtooth', 0.1); } // Düşük eleme sesi
}

// --- GLOBAL STATE ---
const STATE = {
    array: [],
    size: 20,
    speed: 800,
    target: null,
    isSorted: true,
    
    // Execution Flags
    isRunning: false,
    isPaused: false,
    stepTrigger: false, // Step butonuna basıldı mı?
    shouldStop: false
};

const audio = new AudioEngine();

// --- DOM ELEMENTS ---
const DOM = {
    // Inputs
    inpSize: document.getElementById('inp-size'),
    inpSizeNum: document.getElementById('inp-size-num'),
    inpSpeed: document.getElementById('inp-speed'),
    dispSpeed: document.getElementById('disp-speed'),
    inpTarget: document.getElementById('inp-target'),
    inpCustom: document.getElementById('inp-custom-data'),
    chkSorted: document.getElementById('chk-sorted'),
    lblSorted: document.getElementById('lbl-sorted'),
    
    // Buttons
    btnGen: document.getElementById('btn-gen'),
    btnRun: document.getElementById('btn-run'),
    btnPause: document.getElementById('btn-pause'),
    btnStep: document.getElementById('btn-step'),
    btnRand: document.getElementById('btn-rand'),
    btnSound: document.getElementById('btn-sound'),

    // Containers
    linContainer: document.getElementById('view-linear'),
    binContainer: document.getElementById('view-binary'),
    linPtrs: document.getElementById('ptr-linear'),
    binPtrs: document.getElementById('ptr-binary'),
    
    // Info
    ovBinary: document.getElementById('ov-binary'),
    linNCalc: document.getElementById('lin-n-calc'),
    binNCalc: document.getElementById('bin-n-calc'),
    linMax: document.getElementById('lin-max-steps'),
    linCur: document.getElementById('lin-cur-step'),
    binMax: document.getElementById('bin-max-steps'),
    binCur: document.getElementById('bin-cur-step')
};

// --- INITIALIZATION ---
window.onload = () => {
    initEvents();
    generateData();
};

function initEvents() {
    // 1. Size Sync (Slider <-> Input)
    DOM.inpSize.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        DOM.inpSizeNum.value = val;
        updateSize(val);
    });
    DOM.inpSizeNum.addEventListener('input', (e) => {
        let val = parseInt(e.target.value);
        if(val < 5) val = 5; if(val > 50) val = 50;
        DOM.inpSize.value = val;
        updateSize(val);
    });

    // 2. Speed
    DOM.inpSpeed.addEventListener('input', (e) => {
        STATE.speed = parseInt(e.target.value);
        DOM.dispSpeed.innerText = `${STATE.speed}ms`;
    });

    // 3. Sorted Toggle
    DOM.chkSorted.addEventListener('change', (e) => {
        STATE.isSorted = e.target.checked;
        DOM.lblSorted.classList.toggle('active', STATE.isSorted);
        
        if(STATE.isSorted) DOM.ovBinary.classList.remove('show');
        else DOM.ovBinary.classList.add('show');

        // Eğer custom data doluysa tekrar sort etme mantığı eklenebilir
        // Ama basitlik için yeni veri üretiyoruz
        if(!DOM.inpCustom.value) generateData();
    });

    // 4. Buttons
    DOM.btnGen.addEventListener('click', () => {
        DOM.inpCustom.value = ''; // Custom temizle
        generateData();
    });
    
    DOM.btnRand.addEventListener('click', pickRandomTarget);
    
    DOM.inpTarget.addEventListener('input', (e) => {
        STATE.target = e.target.value ? parseInt(e.target.value) : null;
        updateVarDisplays(STATE.target);
    });

    DOM.btnSound.addEventListener('click', () => {
        audio.enabled = !audio.enabled;
        DOM.btnSound.classList.toggle('active', audio.enabled);
        DOM.btnSound.innerHTML = audio.enabled ? '<i class="fas fa-volume-up"></i>' : '<i class="fas fa-volume-mute"></i>';
    });

    // Custom Data Input Listener
    DOM.inpCustom.addEventListener('change', parseCustomData);

    // Simulation Controls
    DOM.btnRun.addEventListener('click', startSimulation);
    
    DOM.btnPause.addEventListener('click', togglePause);
    
    DOM.btnStep.addEventListener('click', () => {
        STATE.stepTrigger = true;
    });
}

function updateSize(val) {
    STATE.size = val;
    if(!DOM.inpCustom.value) generateData();
}

// --- DATA LOGIC ---

function generateData() {
    if(STATE.isRunning) return;

    STATE.array = [];
    const min = 1, max = 99;

    for(let i=0; i<STATE.size; i++) {
        STATE.array.push(Math.floor(Math.random() * (max - min + 1)) + min);
    }

    processDataState();
}

function parseCustomData() {
    const raw = DOM.inpCustom.value;
    if(!raw) return;

    // Virgülle ayır, sayıya çevir, NaN temizle
    const arr = raw.split(',').map(x => parseInt(x.trim())).filter(x => !isNaN(x));

    if(arr.length < 2) {
        alert("Lütfen en az 2 sayı girin!");
        return;
    }
    if(arr.length > 50) {
        alert("Maksimum 50 sayı girebilirsiniz.");
        return;
    }

    STATE.array = arr;
    STATE.size = arr.length;
    
    // UI Update
    DOM.inpSize.value = STATE.size;
    DOM.inpSizeNum.value = STATE.size;

    processDataState();
}

function processDataState() {
    if(STATE.isSorted) {
        STATE.array.sort((a,b) => a-b);
    }

    renderBars(DOM.linContainer, 'linear');
    renderBars(DOM.binContainer, 'binary');
    resetUI();
    updateMetrics();
}

// --- RENDERING ---

function renderBars(container, type) {
    container.innerHTML = '';
    const maxVal = Math.max(...STATE.array);

    STATE.array.forEach((val, idx) => {
        const bar = document.createElement('div');
        bar.className = 'bar';
        bar.id = `${type}-bar-${idx}`;
        bar.style.height = `${(val / maxVal) * 100}%`;
        
        if(STATE.size <= 30) {
            const span = document.createElement('span');
            span.innerText = val;
            bar.appendChild(span);
        }
        container.appendChild(bar);
    });
}

function updateMetrics() {
    // Linear O(N)
    DOM.linNCalc.innerText = `N = ${STATE.size}`;
    DOM.linMax.innerText = STATE.size;
    DOM.linCur.innerText = '0';

    // Binary O(log N)
    const logN = Math.floor(Math.log2(STATE.size)) + 1;
    DOM.binNCalc.innerText = `log₂${STATE.size} ≈ ${logN}`;
    DOM.binMax.innerText = logN;
    DOM.binCur.innerText = '0';
}

// --- SIMULATION CONTROL ENGINE ---

async function wait() {
    // 1. Duraklatma Döngüsü
    while(STATE.isPaused) {
        if(STATE.shouldStop) return;
        
        // Eğer Step'e basıldıysa bir kare ilerle ve döngüyü kır (ama hala pause kalır)
        if(STATE.stepTrigger) {
            STATE.stepTrigger = false;
            return; 
        }
        
        await new Promise(r => setTimeout(r, 100));
    }
    
    // 2. Normal Bekleme
    await new Promise(r => setTimeout(r, STATE.speed));
}

function togglePause() {
    if(!STATE.isRunning) return;
    STATE.isPaused = !STATE.isPaused;
    
    if(STATE.isPaused) {
        DOM.btnPause.innerHTML = '<i class="fas fa-play"></i> DEVAM';
        DOM.btnPause.classList.replace('warning', 'success');
        DOM.btnStep.disabled = false;
    } else {
        DOM.btnPause.innerHTML = '<i class="fas fa-pause"></i> DURAKLAT';
        DOM.btnPause.classList.replace('success', 'warning');
        DOM.btnStep.disabled = true;
    }
}

// --- ALGORITHMS ---

async function startSimulation() {
    if(STATE.target === null || isNaN(STATE.target)) {
        alert("Lütfen bir hedef sayı girin!");
        DOM.inpTarget.focus();
        return;
    }

    STATE.isRunning = true;
    STATE.isPaused = false;
    STATE.shouldStop = false;
    
    toggleControls(false);
    resetUI(true); // Veriyi tut, görseli temizle

    const tasks = [runLinear()];
    if(STATE.isSorted) tasks.push(runBinary());

    await Promise.all(tasks);

    STATE.isRunning = false;
    toggleControls(true);
    // Butonları resetle
    DOM.btnPause.innerHTML = '<i class="fas fa-pause"></i> DURAKLAT';
    DOM.btnPause.classList.replace('success', 'warning');
    DOM.btnPause.disabled = true;
    DOM.btnStep.disabled = true;
}

// LINEAR SEARCH
async function runLinear() {
    const bars = DOM.linContainer.children;
    let steps = 0;

    highlightCode('linear', 1);
    
    for(let i=0; i<STATE.size; i++) {
        if(STATE.shouldStop) return;
        
        steps++;
        DOM.linCur.innerText = steps;

        updateVarDisplay('lin', 'i', i);
        updateVarDisplay('lin', 'val', STATE.array[i]);
        
        bars[i].classList.add('active');
        movePointer(DOM.linPtrs, 'i', i, 'i');
        audio.playCompare();
        
        highlightCode('linear', 2);
        await wait();

        if(STATE.array[i] === STATE.target) {
            bars[i].classList.remove('active');
            bars[i].classList.add('found');
            audio.playFound();
            highlightCode('linear', 3);
            return;
        }

        bars[i].classList.remove('active');
        bars[i].classList.add('eliminated'); 
    }
    highlightCode('linear', 4);
}

// BINARY SEARCH
async function runBinary() {
    const bars = DOM.binContainer.children;
    let low = 0;
    let high = STATE.size - 1;
    let steps = 0;

    highlightCode('binary', 1);

    while(low <= high) {
        if(STATE.shouldStop) return;

        steps++;
        DOM.binCur.innerText = steps;

        // Scope visualization
        for(let i=0; i<STATE.size; i++) {
            if(i < low || i > high) {
                bars[i].classList.add('eliminated');
                bars[i].classList.remove('active');
            } else {
                bars[i].classList.remove('eliminated');
            }
        }
        
        updateVarDisplay('bin', 'l', low);
        updateVarDisplay('bin', 'h', high);
        
        movePointer(DOM.binPtrs, 'l', low, 'L');
        movePointer(DOM.binPtrs, 'h', high, 'H');

        let mid = Math.floor((low + high) / 2);
        updateVarDisplay('bin', 'm', mid);
        updateVarDisplay('bin', 'val', STATE.array[mid]);
        
        highlightCode('binary', 2);
        
        bars[mid].classList.add('active');
        movePointer(DOM.binPtrs, 'm', mid, 'M');
        audio.playCompare();
        
        await wait();

        highlightCode('binary', 3);
        if(STATE.array[mid] === STATE.target) {
            bars[mid].classList.remove('active');
            bars[mid].classList.add('found');
            audio.playFound();
            
            // Focus effect
            for(let k=0; k<STATE.size; k++) if(k!==mid) bars[k].classList.add('eliminated');
            
            return;
        }

        audio.playEliminate();
        if(STATE.array[mid] < STATE.target) {
            highlightCode('binary', 4);
            low = mid + 1;
        } else {
            highlightCode('binary', 5);
            high = mid - 1;
        }
        
        bars[mid].classList.remove('active');
    }
}

// --- HELPERS ---

function highlightCode(algo, line) {
    document.querySelectorAll(`#code-${algo} div`).forEach(d => d.className = '');
    const el = document.getElementById(algo === 'linear' ? `ln-${line}` : `bn-${line}`);
    if(el) el.className = 'highlight';
}

function movePointer(container, type, index, text) {
    const old = container.querySelector(`.ptr-${type}`);
    if(old) old.remove();

    if(index < 0 || index >= STATE.size) return;

    const barWidth = 100 / STATE.size;
    const leftPos = (index * barWidth) + (barWidth / 2);

    const ptr = document.createElement('div');
    ptr.className = `ptr ptr-${type}`;
    ptr.style.left = `${leftPos}%`;
    ptr.innerHTML = `<i class="fas fa-chevron-down"></i>${text}`;
    
    container.appendChild(ptr);
}

function updateVarDisplay(algo, key, val) {
    const el = document.getElementById(`v-${algo}-${key}`);
    if(el) el.innerText = val;
}

function updateVarDisplays(targetVal) {
    document.querySelectorAll('.v-target').forEach(e => e.innerText = targetVal || '-');
}

function pickRandomTarget() {
    if(STATE.array.length === 0) generateData();
    const rnd = STATE.array[Math.floor(Math.random() * STATE.size)];
    STATE.target = rnd;
    DOM.inpTarget.value = rnd;
    updateVarDisplays(rnd);
}

function resetUI(keepData = false) {
    document.querySelectorAll('.bar').forEach(b => b.className = 'bar');
    document.querySelectorAll('.ptr').forEach(p => p.remove());
    document.querySelectorAll('.highlight').forEach(h => h.className = '');
    
    ['i','val'].forEach(k => updateVarDisplay('lin', k, '-'));
    ['l','h','m','val'].forEach(k => updateVarDisplay('bin', k, '-'));

    DOM.linCur.innerText = '0';
    DOM.binCur.innerText = '0';
}

function toggleControls(enable) {
    DOM.btnGen.disabled = !enable;
    DOM.btnRun.disabled = !enable;
    DOM.btnPause.disabled = enable; // Run bitince Pause disable olur
    DOM.btnStep.disabled = true; // Step her zaman başta disable
    DOM.inpSize.disabled = !enable;
    DOM.inpSizeNum.disabled = !enable;
    DOM.chkSorted.disabled = !enable;
    DOM.inpCustom.disabled = !enable;
}