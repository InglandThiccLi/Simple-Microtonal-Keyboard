class EffectsManager {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.modal = document.getElementById('effectsModal');
        
        // ADSR parameters
        this.adsr = {
            attack: 0.01,
            decay: 0.1,
            sustain: 0.8,
            release: 0.3
        };
        
        // FM parameters
        this.fm = {
			cf: 0,
			ff: 0,
            frequency: 0,
			cd: 0,
			fd: 0,
            depth: 0
        };
        
        // AM parameters
        this.am = {
			cf: 0,
			ff: 0,
            frequency: 0,
			cd: 0,
			fd: 0,
            depth: 0
        };
        
        this.init();
        this.loadEffectsSettings();
    }

    init() {
        this.setupEventListeners();
        this.updateAllKnobValues();
    }

    setupEventListeners() {
        // Modal controls
        document.getElementById('effectsBtn').addEventListener('click', () => this.showModal());
        document.getElementById('closeEffectsBtn').addEventListener('click', () => this.hideModal());
        document.getElementById('saveEffectsBtn').addEventListener('click', () => this.saveEffectsSettings());

        // Close modal on overlay click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hideModal();
        });

        // ADSR knobs
        document.getElementById('attackKnob').addEventListener('input', (e) => {
            this.adsr.attack = parseFloat(e.target.value);
            document.getElementById('attackValue').textContent = `${this.adsr.attack.toFixed(2)}s`;
        });

        document.getElementById('decayKnob').addEventListener('input', (e) => {
            this.adsr.decay = parseFloat(e.target.value);
            document.getElementById('decayValue').textContent = `${this.adsr.decay.toFixed(2)}s`;
        });

        document.getElementById('sustainKnob').addEventListener('input', (e) => {
            this.adsr.sustain = parseFloat(e.target.value);
            document.getElementById('sustainValue').textContent = this.adsr.sustain.toFixed(2);
        });

        document.getElementById('releaseKnob').addEventListener('input', (e) => {
            this.adsr.release = parseFloat(e.target.value);
            document.getElementById('releaseValue').textContent = `${this.adsr.release.toFixed(2)}s`;
        });

        // FM knobs
        document.getElementById('coarseFMFreqKnob').addEventListener('input', (e) => {
            this.fm.cf = parseFloat(e.target.value);
            document.getElementById('coarseFMFreqValue').textContent = `${this.fm.cf}x`;
			this.fm.frequency = this.fm.cf + this.fm.ff;
        });
		
		document.getElementById('fineFMFreqKnob').addEventListener('input', (e) => {
            this.fm.ff = parseFloat(e.target.value);
            document.getElementById('fineFMFreqValue').textContent = `${this.fm.ff}x`;
			this.fm.frequency = this.fm.cf + this.fm.ff;
        });

        document.getElementById('coarseFMDepthKnob').addEventListener('input', (e) => {
            this.fm.cd = parseFloat(e.target.value);
            document.getElementById('coarseFMDepthValue').textContent = `${this.fm.cd}%`;
			this.fm.depth = this.fm.cd + this.fm.fd;
        });
		
		document.getElementById('fineFMDepthKnob').addEventListener('input', (e) => {
            this.fm.fd = parseFloat(e.target.value);
            document.getElementById('fineFMDepthValue').textContent = `${this.fm.fd}%`;
			this.fm.depth = this.fm.cd + this.fm.fd;
        });

        // AM knobs
        document.getElementById('coarseAMFreqKnob').addEventListener('input', (e) => {
            this.am.cf = parseFloat(e.target.value);
            document.getElementById('coarseAMFreqValue').textContent = `${this.am.cf}x`;
			this.am.frequency = this.am.cf + this.am.ff;
        });
		
		document.getElementById('fineAMFreqKnob').addEventListener('input', (e) => {
            this.am.ff = parseFloat(e.target.value);
            document.getElementById('fineAMFreqValue').textContent = `${this.am.ff}x`;
			this.am.frequency = this.am.cf + this.am.ff;
        });

        document.getElementById('coarseAMDepthKnob').addEventListener('input', (e) => {
            this.am.cd = parseFloat(e.target.value);
            document.getElementById('coarseAMDepthValue').textContent = `${this.am.cd}%`;
			this.am.depth = this.am.cd + this.am.fd;
        });
		
		document.getElementById('fineAMDepthKnob').addEventListener('input', (e) => {
            this.am.fd = parseFloat(e.target.value);
            document.getElementById('fineAMDepthValue').textContent = `${this.am.fd}%`;
			this.am.depth = this.am.cd + this.am.fd;
        });
    }

    showModal() {
        this.modal.classList.add('show');
    }

    hideModal() {
        this.modal.classList.remove('show');
    }

    updateAllKnobValues() {
        // ADSR
        document.getElementById('attackKnob').value = this.adsr.attack;
        document.getElementById('attackValue').textContent = `${this.adsr.attack.toFixed(2)}s`;
        
        document.getElementById('decayKnob').value = this.adsr.decay;
        document.getElementById('decayValue').textContent = `${this.adsr.decay.toFixed(2)}s`;
        
        document.getElementById('sustainKnob').value = this.adsr.sustain;
        document.getElementById('sustainValue').textContent = this.adsr.sustain.toFixed(2);
        
        document.getElementById('releaseKnob').value = this.adsr.release;
        document.getElementById('releaseValue').textContent = `${this.adsr.release.toFixed(2)}s`;

        // FM
        document.getElementById('coarseFMFreqKnob').value = this.fm.cf;
        document.getElementById('coarseFMFreqValue').textContent = `${this.fm.cf}x`;
		document.getElementById('fineFMFreqKnob').value = this.fm.ff;
        document.getElementById('fineFMFreqValue').textContent = `${this.fm.ff}x`;
        
        document.getElementById('coarseFMDepthKnob').value = this.fm.cd;
        document.getElementById('coarseFMDepthValue').textContent = `${this.fm.cd}%`;
		document.getElementById('fineFMDepthKnob').value = this.fm.fd;
        document.getElementById('fineFMDepthValue').textContent = `${this.fm.fd}%`;

        // AM
        document.getElementById('coarseAMFreqKnob').value = this.am.cf;
        document.getElementById('coarseAMFreqValue').textContent = `${this.am.cf}x`;
		document.getElementById('fineAMFreqKnob').value = this.am.ff;
        document.getElementById('fineAMFreqValue').textContent = `${this.am.ff}x`;
        
        document.getElementById('coarseAMDepthKnob').value = this.am.cd;
        document.getElementById('coarseAMDepthValue').textContent = `${this.am.cd}%`;
		document.getElementById('fineAMDepthKnob').value = this.am.fd;
        document.getElementById('fineAMDepthValue').textContent = `${this.am.fd}%`;
    }

    createEffectChain(frequency, waveform, customWaveform) {
        const oscillator = this.audioContext.createOscillator();
        const envelope = this.audioContext.createGain();
        
        // Set up oscillator
        if (customWaveform) {
            const real = new Float32Array(customWaveform.real);
            const imag = new Float32Array(customWaveform.imag);
            const periodicWave = this.audioContext.createPeriodicWave(real, imag);
            oscillator.setPeriodicWave(periodicWave);
        } else {
            oscillator.type = waveform;
        }
        
        // Create modulation nodes
        let finalOscillator = oscillator;
        
        // FM Synthesis
        if (this.fm.frequency > 0 && this.fm.depth > 0) {
            const fmOscillator = this.audioContext.createOscillator();
            const fmGain = this.audioContext.createGain();
            
            fmOscillator.type = 'sine';
            fmOscillator.frequency.value = this.fm.frequency * frequency;
            fmGain.gain.value = this.fm.depth;
            
            fmOscillator.connect(fmGain);
            fmGain.connect(oscillator.frequency);
            fmOscillator.start();
            
            finalOscillator._fmOscillator = fmOscillator;
        }
        
        oscillator.frequency.value = frequency;
        
        // AM Synthesis
        if (this.am.frequency > 0 && this.am.depth > 0) {
            const amOscillator = this.audioContext.createOscillator();
            const amGain = this.audioContext.createGain();
            const amDepthGain = this.audioContext.createGain();
            
            amOscillator.type = 'sine';
            amOscillator.frequency.value = this.am.frequency * frequency;
            amDepthGain.gain.value = this.am.depth / 100;
            amGain.gain.value = 1 - (this.am.depth / 100);
            
            amOscillator.connect(amDepthGain);
            amDepthGain.connect(amGain.gain);
            amOscillator.start();
            
            oscillator.connect(amGain);
            finalOscillator = amGain;
            finalOscillator._amOscillator = amOscillator;
        } else {
            finalOscillator = oscillator;
        }
        
        // Connect to envelope
        finalOscillator.connect(envelope);
        
        return { oscillator, envelope, finalOscillator };
    }

    applyADSREnvelope(envelope, noteOn = true) {
        const now = this.audioContext.currentTime;
        
        if (noteOn) {
            // Note on: Attack -> Decay -> Sustain
            envelope.gain.cancelScheduledValues(now);
            envelope.gain.setValueAtTime(0, now);
            envelope.gain.linearRampToValueAtTime(1, now + this.adsr.attack);
            envelope.gain.exponentialRampToValueAtTime(
                Math.max(this.adsr.sustain, 0.001), 
                now + this.adsr.attack + this.adsr.decay
            );
        } else {
            // Note off: Release
            envelope.gain.cancelScheduledValues(now);
            envelope.gain.setValueAtTime(envelope.gain.value, now);
            envelope.gain.exponentialRampToValueAtTime(0.001, now + this.adsr.release);
        }
    }

    saveEffectsSettings() {
        const settings = {
            adsr: this.adsr,
            fm: this.fm,
            am: this.am
        };
        
        localStorage.setItem('audioEffectsSettings', JSON.stringify(settings));
        this.hideModal();
    }

    loadEffectsSettings() {
        try {
            const settings = localStorage.getItem('audioEffectsSettings');
            if (settings) {
                const parsed = JSON.parse(settings);
                this.adsr = { ...this.adsr, ...parsed.adsr };
                this.fm = { ...this.fm, ...parsed.fm };
                this.am = { ...this.am, ...parsed.am };
                this.updateAllKnobValues();
            }
        } catch (error) {
            console.error('Error loading effects settings:', error);
        }
    }
}

// Make effectsManager globally accessible
let effectsManager;