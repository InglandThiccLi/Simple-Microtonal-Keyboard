class MicrotonalPlayer {
	constructor() {
		this.audioContext = null;
		this.oscillators = new Map();
		this.gainNode = null;
		this.currentScale = 'chromatic';
		this.currentTonic = 'C';
		this.currentOctave = 3;
		this.currentWaveform = 'sine';
		
		this.scaleDefinitions = {
			'major': { steps: [0, 2, 4, 5, 7, 9, 11], divisions: 12 },
			'minor': { steps: [0, 2, 3, 5, 7, 8, 10], divisions: 12 },
			'chromatic': { steps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], divisions: 12 },
			'pentatonic-major': { steps: [0, 2, 4, 7, 9], divisions: 12 },
			'pentatonic-minor': { steps: [0, 3, 5, 7, 10], divisions: 12 },
			'whole-tone': { steps: [0, 2, 4, 6, 8, 10], divisions: 12 },
			'15-tet': { steps: Array.from({length: 15}, (_, i) => i), divisions: 15 },
			'19-tet': { steps: Array.from({length: 19}, (_, i) => i), divisions: 19 },
			'24-tet': { steps: Array.from({length: 24}, (_, i) => i), divisions: 24 },
			'31-tet': { steps: Array.from({length: 31}, (_, i) => i), divisions: 31 }
		};

		this.noteNames12 = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

		this.noteNames = ['C', 'C𝄲', 'C#', 'D♭', 'D𝄳', 'D', 'D𝄲', 'D#', 'E♭', 'E𝄳', 'E', 'E𝄲', 'F𝄳', 'F', 'F𝄲', 'F#', 'G♭', 'G𝄳', 'G', 'G𝄲', 'G#', 'A♭', 'A𝄳', 'A', 'A𝄲', 'A#', 'B♭', 'B𝄳', 'B', 'B𝄲', 'C𝄳'];

		this.activeInputs = new Map(); // Track active touches and mouse
		this.noteHolders = new Map(); // Track which notes are held by which input

		this.init();
	}

	async init() {
		const volume = localStorage.getItem('volume');
		this.volume = (volume == null) ? 0.5 : parseFloat(volume);
		
		const waveform = localStorage.getItem('waveform');
		this.currentWaveform = (waveform == null) ? 'sine' : waveform;

		this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
		const startOverlay = document.getElementById('startOverlay');
		startOverlay.addEventListener("click", () => {
            if (this.audioContext.state === "suspended") {
                this.audioContext.resume();
				startOverlay.classList.remove('d-block');
				startOverlay.classList.add('d-none');
            }
	    });

		this.gainNode = this.audioContext.createGain();
		this.gainNode.connect(this.audioContext.destination);
		this.gainNode.gain.value = this.volume;
		document.getElementById('volumeValue').textContent = this.volume*100 + '%';
		document.getElementById('volumeSlider').value = this.volume*100;
		document.getElementById('waveformSelect').value = this.currentWaveform;

		waveformCreator = new WaveformCreator(this.audioContext);
		effectsManager = new EffectsManager(this.audioContext);

		this.setupEventListeners();
		this.setupTouchEvents();
		this.generateKeyboard();
	}

	setupEventListeners() {
		document.getElementById('scaleSelect').addEventListener('change', (e) => {
			this.currentScale = e.target.value;
			this.generateKeyboard();
		});

		document.getElementById('tonicSelect').addEventListener('change', (e) => {
			this.currentTonic = e.target.value;
			this.generateKeyboard();
		});

		document.getElementById('octaveSelect').addEventListener('change', (e) => {
			this.currentOctave = parseInt(e.target.value);
			this.generateKeyboard();
		});

		document.getElementById('waveformSelect').addEventListener('change', (e) => {
			this.currentWaveform = e.target.value;
			localStorage.setItem('waveform', this.currentWaveform);
		});

		document.getElementById('volumeSlider').addEventListener('input', (e) => {
			this.volume = e.target.value / 100;
			this.gainNode.gain.value = this.volume;
			document.getElementById('volumeValue').textContent = e.target.value + '%';
			localStorage.setItem('volume', JSON.stringify(this.volume));
		});
	}

	setupTouchEvents() {
		// Global touch move handling
		document.addEventListener('touchmove', (e) => {
			for (let touch of e.touches) {
				const touchId = `touch-${touch.identifier}`;
				if (this.activeInputs.has(touchId)) {
					const element = document.elementFromPoint(touch.clientX, touch.clientY);
					
					if (element && element.classList.contains('note-button')) {
						const key = `${element.dataset.octave}-${element.dataset.note}`;
						
						// Stop previous notes held by this touch
						this.noteHolders.forEach((holders, noteKey) => {
							if (holders.has(touchId) && noteKey !== key) {
								holders.delete(touchId);
								if (holders.size === 0) {
									const oscillatorData = this.oscillators.get(noteKey);
									if (oscillatorData) {
										const { oscillator, envelope, finalOscillator } = oscillatorData;
                						effectsManager.applyADSREnvelope(envelope, false);

										setTimeout(() => {
											oscillator.stop();
											if (finalOscillator._fmOscillator) {
												finalOscillator._fmOscillator.stop();
											}
											if (finalOscillator._amOscillator) {
												finalOscillator._amOscillator.stop();
											}
										}, effectsManager.adsr.release * 1000 + 100);

										this.oscillators.delete(noteKey);
										const [octave, note] = noteKey.split('-');
										const buttonElement = document.querySelector(`[data-octave="${octave}"][data-note="${note}"]`);
										if (buttonElement) buttonElement.classList.remove('active');
									}
									this.noteHolders.delete(noteKey);
								}
							}
						});
						
						// Start new note if not already held by this touch
						if (!this.noteHolders.has(key) || !this.noteHolders.get(key).has(touchId)) {
							if (!this.oscillators.has(key)) {
								const frequency = parseFloat(element.dataset.frequency);

								const customWaveform = waveformCreator.getCustomWaveform(this.currentWaveform);
								const { oscillator, envelope, finalOscillator } = effectsManager.createEffectChain(
									frequency, 
									this.currentWaveform, 
									customWaveform
								);
								
								envelope.connect(this.gainNode);
								effectsManager.applyADSREnvelope(envelope, true);
								
								oscillator.start();
								
								this.oscillators.set(key, { oscillator, envelope, finalOscillator });
								element.classList.add('active');
							}
							
							if (!this.noteHolders.has(key)) {
								this.noteHolders.set(key, new Set());
							}
							this.noteHolders.get(key).add(touchId);
						}
					}
				}
			}
		});

		// Global touch end - this is the key fix
		document.addEventListener('touchend', (e) => {
			for (let touch of e.changedTouches) {
				const touchId = `touch-${touch.identifier}`;
				if (this.activeInputs.has(touchId)) {
					this.activeInputs.delete(touchId);
					// Stop ALL notes held by this specific touch ID
					const notesToRemove = [];
					this.noteHolders.forEach((holders, noteKey) => {
						if (holders.has(touchId)) {
							holders.delete(touchId);
							if (holders.size === 0) {
								notesToRemove.push(noteKey);
							}
						}
					});
					
					// Clean up the notes that are no longer held by any input
					notesToRemove.forEach(noteKey => {
						const oscillatorData = this.oscillators.get(noteKey);
						if (oscillatorData) {
							const { oscillator, envelope, finalOscillator } = oscillatorData;
							effectsManager.applyADSREnvelope(envelope, false);
							
							setTimeout(() => {
								oscillator.stop();
								if (finalOscillator._fmOscillator) {
									finalOscillator._fmOscillator.stop();
								}
								if (finalOscillator._amOscillator) {
									finalOscillator._amOscillator.stop();
								}
							}, effectsManager.adsr.release * 1000 + 100);
							
							this.oscillators.delete(noteKey);
							const [octave, note] = noteKey.split('-');
							const buttonElement = document.querySelector(`[data-octave="${octave}"][data-note="${note}"]`);
							if (buttonElement) buttonElement.classList.remove('active');
						}
						this.noteHolders.delete(noteKey);
					});
				}
			}
		});
	}

	generateKeyboard() {
		const keyboard = document.getElementById('keyboard');
		keyboard.innerHTML = '';

		const scale = this.scaleDefinitions[this.currentScale];
		const notesPerRow = scale.steps.length;

		for (let octave = 0; octave < 6 + Math.min(0, 4 - this.currentOctave); octave++) {
			const row = document.createElement('div');
			row.className = 'octave-row';

			// Octave label
			const label = document.createElement('div');
			label.className = 'octave-label';
			label.textContent = `Oct ${this.currentOctave + octave}`;
			row.appendChild(label);

			// Notes container
			const notesContainer = document.createElement('div');
			notesContainer.className = 'notes-container';


			for (let note = 0; note < notesPerRow; note++) {
				const button = document.createElement('button');
				button.className = 'btn note-button nb-'+this.currentScale;
				
				const noteName = this.getNoteNameForScale(note);
				button.textContent = noteName;
				button.dataset.octave = this.currentOctave + octave;
				button.dataset.note = note;
				button.dataset.frequency = this.calculateFrequency(note, octave);
				if (!this.noteNames12.includes(noteName)) {
					button.className += ' nb-special';
				}

				this.setupNoteEvents(button);
				notesContainer.appendChild(button);
			}

			row.appendChild(notesContainer);
			keyboard.appendChild(row);
		}
	}

	getNoteNameForScale(noteIndex) {
		const scale = this.scaleDefinitions[this.currentScale];
		
		if (this.currentScale.includes('-tet')) {
			const tonicIndex = this.noteNames.indexOf(this.currentTonic);
			const semitoneStep = (scale.steps[noteIndex] * 31) / scale.divisions;
			const noteNameIndex = Math.round((tonicIndex + semitoneStep) % 31) % 31;
			console.log(noteNameIndex);
			return this.noteNames[noteNameIndex];
		} else {
			const tonicIndex = this.noteNames12.indexOf(this.currentTonic);
			const semitoneStep = scale.steps[noteIndex];
			const noteNameIndex = (tonicIndex + semitoneStep) % 12;
			return this.noteNames12[noteNameIndex];
		}
	}

	calculateFrequency(noteIndex, octaveOffset) {
		const scale = this.scaleDefinitions[this.currentScale];
		const tonicIndex = this.noteNames12.indexOf(this.currentTonic);
		
		// Base frequency for C4 (middle C)
		const c4Frequency = 261.626;
		
		// Calculate the frequency of the tonic in the base octave
		const tonicFrequency = c4Frequency * Math.pow(2, (tonicIndex - 0) / 12 + (this.currentOctave - 4));
		
		// Calculate the step frequency using equal temperament
		const stepRatio = Math.pow(2, scale.steps[noteIndex] / scale.divisions);
		
		// Apply octave offset
		const octaveMultiplier = Math.pow(2, octaveOffset);
		
		return tonicFrequency * stepRatio * octaveMultiplier;
	}

	setupNoteEvents(button) {
		const startNote = (inputId) => {
			if (this.audioContext.state === 'suspended') {
				this.audioContext.resume();
			}
			
			const frequency = parseFloat(button.dataset.frequency);
			const key = `${button.dataset.octave}-${button.dataset.note}`;
			
			if (!this.oscillators.has(key)) {
				// Handle custom waveforms
				const customWaveform = waveformCreator.getCustomWaveform(this.currentWaveform);
				const { oscillator, envelope, finalOscillator } = effectsManager.createEffectChain(
					frequency, 
					this.currentWaveform, 
					customWaveform
				);

				envelope.connect(this.gainNode);
				effectsManager.applyADSREnvelope(envelope, true);
				oscillator.start();
				
				this.oscillators.set(key, { oscillator, envelope, finalOscillator });
				button.classList.add('active');
			}
			
			if (!this.noteHolders.has(key)) {
				this.noteHolders.set(key, new Set());
			}
			this.noteHolders.get(key).add(inputId);
		};

		const stopNote = (inputId) => {
			const key = `${button.dataset.octave}-${button.dataset.note}`;
			
			// Remove this input from holding this note
			if (this.noteHolders.has(key)) {
				this.noteHolders.get(key).delete(inputId);
				
				// Only stop the note if no inputs are holding it
				if (this.noteHolders.get(key).size === 0) {
					const oscillatorData = this.oscillators.get(key);
					if (oscillatorData) {
						const { oscillator, envelope, finalOscillator } = oscillatorData;
						effectsManager.applyADSREnvelope(envelope, false);
						setTimeout(() => {
							oscillator.stop();
							if (finalOscillator._fmOscillator) {
								finalOscillator._fmOscillator.stop();
							}
							if (finalOscillator._amOscillator) {
								finalOscillator._amOscillator.stop();
							}
						}, effectsManager.adsr.release * 1000 + 100);

						this.oscillators.delete(key);
						button.classList.remove('active');
					}
					this.noteHolders.delete(key);
				}
			}
		};

		
		// Mouse events
		button.addEventListener('mousedown', (e) => {
			this.activeInputs.set('mouse', true);
			startNote('mouse');
		});
		
		button.addEventListener('mouseup', (e) => {
			this.activeInputs.delete('mouse');
			stopNote('mouse');
		});
		
		button.addEventListener('mouseleave', (e) => {
			if (this.activeInputs.has('mouse')) {
				stopNote('mouse');
			}
		});
		
		button.addEventListener('mouseenter', (e) => {
			if (this.activeInputs.has('mouse') && e.buttons === 1) {
				startNote('mouse');
			}
		});

		// Touch events
		button.addEventListener('touchstart', (e) => {
			const touchedElement = e.target;
        	if (touchedElement && e.cancelable) e.preventDefault();
			for (let touch of e.changedTouches) {
				const touchId = `touch-${touch.identifier}`;
				this.activeInputs.set(touchId, true);
				startNote(touchId);
			}
		});
	}
}