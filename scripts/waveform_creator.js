class WaveformCreator {
    constructor(audioContext) {
        this.audioContext = audioContext;
        this.modal = document.getElementById('waveformModal');
        this.canvas = document.getElementById('waveformCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.maxHarmonics = 16; // Maximum harmonics allowed
        this.currentHarmonics = 4; // Start with 4 harmonics
        this.real = new Float32Array(this.maxHarmonics + 1); // Index 0 is always 0
        this.imag = new Float32Array(this.maxHarmonics + 1); // Index 0 is always 0
        this.customWaveforms = new Map();
        this.testOscillator = null;
        this.testGain = null;
        
        this.real[0] = 0; // DC component must be 0
        this.imag[0] = 0; // DC component must be 0
        
        this.init();
        this.loadCustomWaveforms();
    }

    init() {
        this.createSliders();
        this.setupEventListeners();
        this.updateCanvas();
        this.updateWaveformName();
    }
	
    createSliders() {
        const container = document.getElementById('slidersScroll');
		container.innerHTML = '';

		for (let i = 1; i <= this.currentHarmonics; i++) {
			this.createVerticalSlider(i, container);
		}
		
		this.updateAddHarmonicButton();
    }

    createVerticalSlider(harmonicNumber, container) {
		const group = document.createElement('div');
		group.className = 'vertical-slider-group';
		group.id = `harmonic-${harmonicNumber}`;
		
		const showDelete = (harmonicNumber > 4) ? `<button class="delete-btn-circle" onclick="waveformCreator.deleteHarmonic(${harmonicNumber})" title="Delete">×</button>` : ``;
		
		
		group.innerHTML = `
			<div class="slider-header">
				<div class="harmonic-title">H${harmonicNumber}</div>
				<div class="slider-buttons">
					<button class="reset-btn-circle" onclick="waveformCreator.resetHarmonic(${harmonicNumber})" title="Reset">
						↻
					</button>
					${showDelete}
				</div>
			</div>
			
			<div class="vertical-sliders">
				<div class="vertical-slider-pair">
					<div class="vertical-slider-container">
						<div class="slider-label">Real</div>
						<input type="range" id="real${harmonicNumber}" min="-1" max="1" step="0.01" value="0" 
							   class="vertical-slider" orient="vertical">
					</div>
					
					<div class="vertical-slider-container">
						<div class="slider-label">Imag</div>
						<input type="range" id="imag${harmonicNumber}" min="-1" max="1" step="0.01" value="0" 
							   class="vertical-slider" orient="vertical">
					</div>
				</div>
			</div>
			
			<div class="slider-values">
				<div class="value-display-small" id="realValue${harmonicNumber}">0.00</div>
				<div class="value-display-small" id="imagValue${harmonicNumber}">0.00</div>
			</div>
		`;
		
		container.appendChild(group);
		
		// Add event listeners for this harmonic
		this.setupHarmonicEventListeners(harmonicNumber);
	}

    setupHarmonicEventListeners(harmonicNumber) {
		const realSlider = document.getElementById('real'+harmonicNumber);
		const imagSlider = document.getElementById('imag'+harmonicNumber);
		
		if (realSlider) {
			realSlider.addEventListener('input', (e) => {
				this.real[harmonicNumber] = parseFloat(e.target.value);
				document.getElementById('realValue'+harmonicNumber).textContent = parseFloat(e.target.value).toFixed(2);
				this.updateCanvas();
			});
		}
		
		if (imagSlider) {
			imagSlider.addEventListener('input', (e) => {
				this.imag[harmonicNumber] = parseFloat(e.target.value);
				document.getElementById('imagValue'+harmonicNumber).textContent = parseFloat(e.target.value).toFixed(2);
				this.updateCanvas();
			});
		}
	}
	
	setupSingleSliderListener(slider, harmonicNumber, type) {
		slider.addEventListener('input', (e) => {
			const value = parseFloat(e.target.value);
			this[type][harmonicNumber] = value;
			document.getElementById(`${type}Value${harmonicNumber}`).textContent = value.toFixed(2);
			this.updateCanvas();
		});
	}

    setupEventListeners() {
        // Modal controls
        document.getElementById('createWaveformBtn').addEventListener('click', () => this.showModal());
        document.getElementById('closeModalBtn').addEventListener('click', () => this.hideModal());
        document.getElementById('playWaveformBtn').addEventListener('click', () => this.playTestTone());
        document.getElementById('saveWaveformBtn').addEventListener('click', () => this.saveWaveform());
        
        // Delete button
        document.getElementById('deleteWaveformBtn').addEventListener('click', () => this.deleteCurrentWaveform());
        
        // Waveform selection change
        document.getElementById('waveformSelect').addEventListener('change', () => this.updateDeleteButtonVisibility());

        // Add harmonic button
        document.getElementById('addHarmonicBtn').addEventListener('click', () => this.addHarmonic());

        // Close modal on overlay click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.hideModal();
        });
    }

    addHarmonic() {
        if (this.currentHarmonics < this.maxHarmonics) {
            this.currentHarmonics++;
            const container = document.getElementById('slidersScroll');
            this.createVerticalSlider(this.currentHarmonics, container);
            this.updateAddHarmonicButton();
            this.updateCanvas();
        }
    }

    deleteHarmonic(harmonicNumber) {
		if (harmonicNumber > 4 && harmonicNumber <= this.currentHarmonics) {
			// Clear the values for the harmonic being deleted
			this.real[harmonicNumber] = 0;
			this.imag[harmonicNumber] = 0;
			
			// Shift all higher harmonics down in the arrays
			for (let i = harmonicNumber + 1; i <= this.currentHarmonics; i++) {
				this.real[i - 1] = this.real[i];
				this.imag[i - 1] = this.imag[i];
				this.real[i] = 0;
				this.imag[i] = 0;
			}
			
			// Remove the DOM element for the deleted harmonic
			const elementToRemove = document.getElementById(`harmonic-${harmonicNumber}`);
			if (elementToRemove) {
				elementToRemove.remove();
			}
			
			// Update all harmonics after the deleted one
			for (let i = harmonicNumber + 1; i <= this.currentHarmonics; i++) {
				const element = document.getElementById(`harmonic-${i}`);
				if (element) {
					const newNumber = i - 1;
					
					// Update the element ID
					element.id = `harmonic-${newNumber}`;
					
					// Update the title
					const title = element.querySelector('.harmonic-title');
					if (title) title.textContent = `H${newNumber}`;
					
					// Update the reset button onclick
					const resetBtn = element.querySelector('.reset-btn-circle');
					if (resetBtn) resetBtn.setAttribute('onclick', waveformCreator.resetHarmonic(newNumber));
					
					// Update the delete button onclick (if it exists)
					const deleteBtn = element.querySelector('.delete-btn-circle');
					if (deleteBtn) deleteBtn.setAttribute('onclick', waveformCreator.deleteHarmonic(newNumber));
					
					// Update slider IDs and event listeners
					const realSlider = element.querySelector(`#real${i}`);
					const imagSlider = element.querySelector(`#imag${i}`);
					const realValue = element.querySelector(`#realValue${i}`);
					const imagValue = element.querySelector(`#imagValue${i}`);
					
					if (realSlider) {
						realSlider.id = `real${newNumber}`;
						realSlider.value = this.real[newNumber];
						// Remove old event listeners and add new ones
						const newRealSlider = realSlider.cloneNode(true);
						realSlider.parentNode.replaceChild(newRealSlider, realSlider);
						this.setupSingleSliderListener(newRealSlider, newNumber, 'real');
					}
					
					if (imagSlider) {
						imagSlider.id = `imag${newNumber}`;
						imagSlider.value = this.imag[newNumber];
						// Remove old event listeners and add new ones
						const newImagSlider = imagSlider.cloneNode(true);
						imagSlider.parentNode.replaceChild(newImagSlider, imagSlider);
						this.setupSingleSliderListener(newImagSlider, newNumber, 'imag');
					}
					
					if (realValue) {
						realValue.id = `realValue${newNumber}`;
						realValue.textContent = this.real[newNumber].toFixed(2);
					}
					
					if (imagValue) {
						imagValue.id = `imagValue${newNumber}`;
						imagValue.textContent = this.imag[newNumber].toFixed(2);
					}
				}
			}
			
			this.currentHarmonics--;
			this.updateAddHarmonicButton();
			this.updateCanvas();
		}
	}

    resetHarmonic(harmonicNumber) {
		this.real[harmonicNumber] = 0;
		this.imag[harmonicNumber] = 0;
		
		const realSlider = document.getElementById('real'+harmonicNumber);
		const imagSlider = document.getElementById('imag'+harmonicNumber);
		const realValue = document.getElementById('realValue'+harmonicNumber);
		const imagValue = document.getElementById('imagValue'+harmonicNumber);
		
		if (realSlider) {
			realSlider.value = 0;
			realValue.textContent = '0.00';
		}
		
		if (imagSlider) {
			imagSlider.value = 0;
			imagValue.textContent = '0.00';
		}
		
		this.updateCanvas();
	}

    resetAllHarmonics() {
        for (let i = 1; i <= this.currentHarmonics; i++) {
            this.resetHarmonic(i);
        }
    }

    updateAddHarmonicButton() {
		const button = document.getElementById('addHarmonicBtn');
		if (button) {
			const isMaxed = this.currentHarmonics >= this.maxHarmonics;
			button.disabled = isMaxed;
			button.textContent = isMaxed ? '✓' : '+';
			button.title = isMaxed ? `Maximum harmonics reached (${this.maxHarmonics})` : 'Add harmonic';
		}
	}

    
    updateDeleteButtonVisibility() {
        const select = document.getElementById('waveformSelect');
        const deleteBtn = document.getElementById('deleteWaveformBtn');
        const currentValue = select.value;
        
        // Show delete button only for custom waveforms
        const isCustomWaveform = !['sine', 'sawtooth', 'square', 'triangle'].includes(currentValue);
        deleteBtn.style.display = isCustomWaveform ? 'block' : 'none';
    }
    
    deleteCurrentWaveform() {
        const select = document.getElementById('waveformSelect');
        const currentValue = select.value;
        
        // Don't delete built-in waveforms
        if (['sine', 'sawtooth', 'square', 'triangle'].includes(currentValue)) {
            return;
        }
        
        // Show confirmation dialog
        this.showDeleteConfirmation(currentValue);
    }
    
    showDeleteConfirmation(waveformName) {
        const confirmationHTML = `
            <div id="deleteConfirmModal" class="modal-overlay show">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5>Delete Waveform</h5>
                    </div>
                    <div class="modal-body">
                        <p>Are you sure you want to delete "${waveformName}"?</p>
                        <p style="color: #dc3545; font-size: 14px;">This action cannot be undone.</p>
                        <div class="d-flex gap-2 justify-content-end mt-3">
                            <button id="cancelDeleteBtn" class="btn btn-outline-secondary">Cancel</button>
                            <button id="confirmDeleteBtn" class="btn btn-danger">Delete</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add to body
        document.body.insertAdjacentHTML('beforeend', confirmationHTML);
        
        // Setup event listeners
        document.getElementById('cancelDeleteBtn').addEventListener('click', () => {
            document.getElementById('deleteConfirmModal').remove();
        });
        
        document.getElementById('confirmDeleteBtn').addEventListener('click', () => {
            this.confirmDelete(waveformName);
            document.getElementById('deleteConfirmModal').remove();
        });
        
        // Close on overlay click
        document.getElementById('deleteConfirmModal').addEventListener('click', (e) => {
            if (e.target.id === 'deleteConfirmModal') {
                document.getElementById('deleteConfirmModal').remove();
            }
        });
    }
    
    confirmDelete(waveformName) {
        // Remove from memory
        this.customWaveforms.delete(waveformName);
        
        // Update localStorage
        this.saveToLocalStorage();
        
        // Update dropdown
        this.updateWaveformDropdown();
        
        // Switch to default waveform
        const select = document.getElementById('waveformSelect');
        select.value = 'sine';
        
        // Trigger change event
        const event = new Event('change');
        select.dispatchEvent(event);
        
        // Update delete button visibility
        this.updateDeleteButtonVisibility();
    }
    
    updateWaveformDropdown() {
        const select = document.getElementById('waveformSelect');
        
        // Remove existing custom options
        const options = Array.from(select.options);
        options.forEach(option => {
            if (!['sine', 'sawtooth', 'square', 'triangle'].includes(option.value)) {
                option.remove();
            }
        });
        
        // Add custom waveforms
        this.customWaveforms.forEach((_, name) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        });
        
        // Update delete button visibility
        this.updateDeleteButtonVisibility();
    }

    showModal() {
        this.modal.classList.add('show');
        this.updateWaveformName();
        // Reset to 4 harmonics when opening modal
        this.currentHarmonics = 4;
        this.resetAllHarmonics();
        this.createSliders();
    }

    hideModal() {
        this.modal.classList.remove('show');
        this.stopTestTone();
    }

    updateCanvas() {
		const canvas = this.canvas;
		const width = canvas.width;
		const height = canvas.height;
		
		this.ctx.clearRect(0, 0, width, height);
		
		// Draw grid
		this.ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
		this.ctx.globalAlpha = 0.2;
		this.ctx.lineWidth = 1;
		
		// Horizontal lines
		for (let i = 0; i <= 4; i++) {
			this.ctx.beginPath();
			this.ctx.moveTo(0, (i * height) / 4);
			this.ctx.lineTo(width, (i * height) / 4);
			this.ctx.stroke();
		}
		
		// Vertical lines
		for (let i = 0; i <= 8; i++) {
			this.ctx.beginPath();
			this.ctx.moveTo((i * width) / 8, 0);
			this.ctx.lineTo((i * width) / 8, height);
			this.ctx.stroke();
		}
		
		this.ctx.globalAlpha = 1;
		
		// Calculate waveform samples first to find min/max for normalization
		const samples = 2048;
		const waveformData = [];
		let minValue = 0;
		let maxValue = 0;
		
		for (let i = 0; i < samples; i++) {
			const t = (i / samples) * 2 * Math.PI;
			
			let y = 0;
			for (let h = 1; h <= this.currentHarmonics; h++) {
				y += this.real[h] * Math.cos(h * t) + this.imag[h] * Math.sin(h * t);
			}
			
			waveformData.push(y);
			minValue = Math.min(minValue, y);
			maxValue = Math.max(maxValue, y);
		}
		
		// Calculate normalization parameters
		const range = Math.max(Math.abs(minValue), Math.abs(maxValue));
		const padding = height * 0.05; // 5% padding from top and bottom
		const availableHeight = height - (2 * padding);
		
		// Draw waveform
		this.ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
		this.ctx.lineWidth = 3;
		this.ctx.beginPath();
		
		for (let i = 0; i < samples; i++) {
			const x = (i / samples) * width;
			let y;
			
			if (range === 0) {
				// If waveform is flat (all harmonics are 0), draw center line
				y = height / 2;
			} else {
				// Normalize and scale to fit canvas with padding
				const normalizedY = waveformData[i] / range; // Range: -1 to 1
				y = padding + (availableHeight / 2) + (normalizedY * availableHeight / 2);
			}
			
			if (i === 0) {
				this.ctx.moveTo(x, y);
			} else {
				this.ctx.lineTo(x, y);
			}
		}
		
		this.ctx.stroke();
		
		// Draw center reference line
		this.ctx.globalAlpha = 0.3;
		this.ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim();
		this.ctx.lineWidth = 1;
		this.ctx.setLineDash([5, 5]);
		this.ctx.beginPath();
		this.ctx.moveTo(0, height / 2);
		this.ctx.lineTo(width, height / 2);
		this.ctx.stroke();
		this.ctx.setLineDash([]); // Reset line dash
		this.ctx.globalAlpha = 1;
	}

    playTestTone() {
        this.stopTestTone();
        
        try {
            // Create arrays with only the current harmonics
            const realArray = new Float32Array(this.currentHarmonics + 1);
            const imagArray = new Float32Array(this.currentHarmonics + 1);
            
            for (let i = 0; i <= this.currentHarmonics; i++) {
                realArray[i] = this.real[i];
                imagArray[i] = this.imag[i];
            }
            
            const periodicWave = this.audioContext.createPeriodicWave(realArray, imagArray);
            this.testOscillator = this.audioContext.createOscillator();
            this.testGain = this.audioContext.createGain();
            
            this.testOscillator.setPeriodicWave(periodicWave);
            this.testOscillator.frequency.value = 440; // A4
            this.testGain.gain.value = 0.3;
            
            this.testOscillator.connect(this.testGain);
            this.testGain.connect(this.audioContext.destination);
            
            this.testOscillator.start();
            
            // Stop after 1 second
            setTimeout(() => this.stopTestTone(), 1000);
        } catch (error) {
            console.error('Error playing test tone:', error);
        }
    }

    stopTestTone() {
        if (this.testOscillator) {
            this.testOscillator.stop();
            this.testOscillator = null;
            this.testGain = null;
        }
    }

    updateWaveformName() {
        const count = this.customWaveforms.size + 1;
        document.getElementById('waveformName').value = `Custom Waveform ${count}`;
    }

    saveWaveform() {
        const name = document.getElementById('waveformName').value.trim();
        if (!name) {
            alert('Please enter a name for the waveform');
            return;
        }
        
        // Only save the harmonics that are currently being used
        const realArray = new Array(this.currentHarmonics + 1);
        const imagArray = new Array(this.currentHarmonics + 1);
        
        for (let i = 0; i <= this.currentHarmonics; i++) {
            realArray[i] = this.real[i];
            imagArray[i] = this.imag[i];
        }
        
        const waveformData = {
            real: realArray,
            imag: imagArray,
            harmonics: this.currentHarmonics
        };
        
        this.customWaveforms.set(name, waveformData);
        this.saveToLocalStorage();
        this.updateWaveformDropdown();
        
        // Select the new waveform
        document.getElementById('waveformSelect').value = name;
        
        // Trigger change event to update the player
        const event = new Event('change');
        document.getElementById('waveformSelect').dispatchEvent(event);
        
        this.hideModal();
    }

    saveToLocalStorage() {
        const data = {};
        this.customWaveforms.forEach((value, key) => {
            data[key] = value;
        });
        localStorage.setItem('customWaveforms', JSON.stringify(data));
    }

    loadCustomWaveforms() {
        try {
            const data = localStorage.getItem('customWaveforms');
            if (data) {
                const parsed = JSON.parse(data);
                Object.entries(parsed).forEach(([name, waveformData]) => {
                    this.customWaveforms.set(name, waveformData);
                });
                this.updateWaveformDropdown();
            }
        } catch (error) {
            console.error('Error loading custom waveforms:', error);
        }
        
        // Setup delete button visibility after loading
        this.updateDeleteButtonVisibility();
    }

    updateWaveformDropdown() {
        const select = document.getElementById('waveformSelect');
        
        // Remove existing custom options
        const options = Array.from(select.options);
        options.forEach(option => {
            if (!['sine', 'sawtooth', 'square', 'triangle'].includes(option.value)) {
                option.remove();
            }
        });
        
        // Add custom waveforms
        this.customWaveforms.forEach((_, name) => {
            const option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            select.appendChild(option);
        });
    }

    getCustomWaveform(name) {
        return this.customWaveforms.get(name);
    }
}

let waveformCreator;