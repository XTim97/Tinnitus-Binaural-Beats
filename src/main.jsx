import React, { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

function App() {
  const [carrier, setCarrier] = useState(220)
  const [beat, setBeat] = useState(8)
  const [volume, setVolume] = useState(8)
  const [noise, setNoise] = useState(0)
  const [minutes, setMinutes] = useState(20)
  const [running, setRunning] = useState(false)
  const [remaining, setRemaining] = useState(0)

  const audioRef = useRef(null)
  const timerRef = useRef(null)

  const stopAudio = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (audioRef.current) {
      try {
        const a = audioRef.current
        a.leftOsc?.stop()
        a.rightOsc?.stop()
        a.noiseSource?.stop()
        a.ctx?.close()
      } catch {}
      audioRef.current = null
    }
    setRunning(false)
    setRemaining(0)
  }

  useEffect(() => () => stopAudio(), [])

  const startAudio = async () => {
    stopAudio()

    const AudioCtx = window.AudioContext || window.webkitAudioContext
    const ctx = new AudioCtx()
    await ctx.resume()

    const master = ctx.createGain()
    master.gain.value = Math.min(volume / 100, 0.20)
    master.connect(ctx.destination)

    const merger = ctx.createChannelMerger(2)

    const leftGain = ctx.createGain()
    const rightGain = ctx.createGain()
    leftGain.gain.value = 1
    rightGain.gain.value = 1

    const leftOsc = ctx.createOscillator()
    const rightOsc = ctx.createOscillator()

    leftOsc.type = 'sine'
    rightOsc.type = 'sine'
    leftOsc.frequency.value = carrier - beat / 2
    rightOsc.frequency.value = carrier + beat / 2

    leftOsc.connect(leftGain).connect(merger, 0, 0)
    rightOsc.connect(rightGain).connect(merger, 0, 1)
    merger.connect(master)

    let noiseSource = null
    if (noise > 0) {
      const bufferSize = ctx.sampleRate * 2
      const buffer = ctx.createBuffer(2, bufferSize, ctx.sampleRate)
      for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch)
        let last = 0
        for (let i = 0; i < bufferSize; i++) {
          const white = Math.random() * 2 - 1
          last = 0.98 * last + 0.02 * white
          data[i] = last * 3
        }
      }
      noiseSource = ctx.createBufferSource()
      noiseSource.buffer = buffer
      noiseSource.loop = true
      const noiseGain = ctx.createGain()
      noiseGain.gain.value = Math.min(noise / 100, 0.25)
      noiseSource.connect(noiseGain).connect(master)
      noiseSource.start()
    }

    leftOsc.start()
    rightOsc.start()

    audioRef.current = { ctx, leftOsc, rightOsc, noiseSource }
    setRunning(true)

    const total = minutes * 60
    setRemaining(total)
    timerRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          setTimeout(stopAudio, 0)
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }

  const preset = (c, b) => {
    setCarrier(c)
    setBeat(b)
  }

  const fmt = (sec) => {
    const m = Math.floor(sec / 60)
    const s = sec % 60
    return `${m}:${String(s).padStart(2,'0')}`
  }

  return (
    <div className="app">
      <header>
        <h1>Tinnitus Binaural Beats</h1>
        <p className="subtitle">Low-volume sound sessions for relaxation</p>
      </header>

      <div className="notice">
        Use headphones at a comfortable, low level. Stop if your tinnitus, dizziness, headache,
        ear pressure, or discomfort increases. This app is not a treatment for tinnitus.
      </div>

      <section className="presets">
        <button onClick={() => preset(220, 4)}>Calm<br/><span>4 Hz</span></button>
        <button onClick={() => preset(220, 6)}>Relax<br/><span>6 Hz</span></button>
        <button onClick={() => preset(220, 8)}>Gentle<br/><span>8 Hz</span></button>
        <button onClick={() => preset(220, 10)}>Focus<br/><span>10 Hz</span></button>
      </section>

      <section className="panel">
        <label>
          Carrier tone: <strong>{carrier} Hz</strong>
          <input type="range" min="100" max="800" step="5" value={carrier}
            disabled={running} onChange={e => setCarrier(Number(e.target.value))} />
        </label>

        <label>
          Binaural difference: <strong>{beat} Hz</strong>
          <input type="range" min="1" max="20" step="1" value={beat}
            disabled={running} onChange={e => setBeat(Number(e.target.value))} />
        </label>

        <label>
          Volume: <strong>{volume}%</strong>
          <input type="range" min="1" max="20" step="1" value={volume}
            disabled={running} onChange={e => setVolume(Number(e.target.value))} />
          <small>Maximum in-app level is limited to 20%.</small>
        </label>

        <label>
          Optional gentle noise: <strong>{noise}%</strong>
          <input type="range" min="0" max="25" step="1" value={noise}
            disabled={running} onChange={e => setNoise(Number(e.target.value))} />
        </label>

        <div className="timerRow">
          {[10,20,30,60].map(m => (
            <button key={m} className={minutes === m ? 'selected' : ''}
              disabled={running} onClick={() => setMinutes(m)}>{m} min</button>
          ))}
        </div>
      </section>

      {running && <div className="remaining">Time remaining: {fmt(remaining)}</div>}

      <div className="controls">
        {!running
          ? <button className="start" onClick={startAudio}>Start Session</button>
          : <button className="stop" onClick={stopAudio}>Stop</button>}
      </div>

      <footer>
        For true binaural beats, use stereo headphones. Keep the iPad system volume low before starting.
      </footer>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
