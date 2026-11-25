/* global window, document, navigator, HTMLVideoElement, CanvasRenderingContext2D, performance, MutationObserver, localStorage */
// Synthetic pixels and landmarks, shared by WebKit/Chrome orchestration tests.
export async function fullCameraFixture(page, { reflected = true, locks = true, frameMs = 34, gpuFailure = false, warmupMs = 0,
  dropCallbacks = false, staleMetadata = false, freezeVideo = false, inferenceStallMs = 0, diagnostics = true } = {}) {
  await page.route('**/@mediapipe_tasks-vision.js*', route => route.fulfill({ contentType: 'application/javascript', body: `
    export const FilesetResolver={forVisionTasks:async()=>({})};
    export class FaceDetector {static async createFromOptions(){throw new Error('Use landmarks');}}
    export class FaceLandmarker {
      static async createFromOptions(_,options){window.modelOptions=options;if(window.gpuFailure&&options.baseOptions.delegate==='GPU')throw new Error('No WebGL');return new FaceLandmarker();}
      close(){window.closedModels=(window.closedModels||0)+1;}
      detectForVideo(){
        this.calls=(this.calls||0)+1;
        if(this.calls===2){const until=performance.now()+(window.inferenceStallMs||0);while(performance.now()<until){/* Slow first live inference. */}}
        if(!this.primed){this.primed=true;const until=performance.now()+(window.warmupMs||0);while(performance.now()<until){/* Simulate cold shader compilation. */}}
        if(document.querySelector('[data-flash-phase]'))throw new Error('Do not run landmark inference on flash-colored frames');
        const {yaw:poseYaw=0,pitch=0,roll=0,blink=.05,count=1,nose=.5,faceScale=1}=window.facePose||{};
        // A real head is never perfectly still; static-frame detection rejects frozen video.
        const yaw=poseYaw+(window.freezeVideo?0:Math.sin(performance.now()*.02)*.4);
        const points=Array.from({length:478},()=>({x:.5,y:.5,z:0}));
        const halfHeight=blink>.3 ? .003 : .012;
        for(const [a,b,c,d,e,f,x] of [[362,385,387,263,373,380,.55],[33,160,158,133,153,144,.35]]){
          points[a]={x,y:.45};points[d]={x:x+.1,y:.45};points[b]={x:x+.02,y:.45-halfHeight};points[c]={x:x+.08,y:.45-halfHeight};points[e]={x:x+.08,y:.45+halfHeight};points[f]={x:x+.02,y:.45+halfHeight};
        }
        points[10]={x:.2,y:.2};points[152]={x:.8,y:.8};points[1]={x:nose+Math.sin(performance.now()*.01)*.001,y:.5};
        for(const point of points){point.x=.5+(point.x-.5)*faceScale;point.y=.5+(point.y-.5)*faceScale;}
        // Column-major rotation Y*X*Z, including the ±180° Euler boundary.
        const [x,y,z]=[pitch,yaw,roll].map(a=>a*Math.PI/180);
        const [cx,sx,cy,sy,cz,sz]=[Math.cos(x),Math.sin(x),Math.cos(y),Math.sin(y),Math.cos(z),Math.sin(z)];
        const data=[cy*cz+sy*sx*sz,cx*sz,cy*sx*sz-sy*cz,0,sy*sx*cz-cy*sz,cx*cz,cy*sx*cz+sy*sz,0,sy*cx,-sx,cy*cx,0,0,0,0,1];
        return {faceLandmarks:Array.from({length:count},()=>points),facialTransformationMatrixes:[{data}],faceBlendshapes:[{categories:[{categoryName:'eyeBlinkLeft',score:blink},{categoryName:'eyeBlinkRight',score:blink}]}]};
      }
    }
  ` }))
  await page.addInitScript(({ reflected, locks, frameMs, gpuFailure, warmupMs, dropCallbacks, staleMetadata, freezeVideo, inferenceStallMs, diagnostics }) => {
    localStorage.setItem('aegis.camera-diagnostics', String(diagnostics))
    window.frameDelay = frameMs; window.gpuFailure = gpuFailure; window.warmupMs = warmupMs
    window.dropCallbacks = dropCallbacks; window.staleMetadata = staleMetadata; window.freezeVideo = freezeVideo; window.inferenceStallMs = inferenceStallMs
    window.cameraCalls = 0; window.testTracks = []; window.constraintWrites = []
    window.flashSeen = []
    new MutationObserver(() => { const phase = document.querySelector('[data-flash-phase]')?.dataset.flashPhase; if (phase && window.flashSeen.at(-1) !== phase) window.flashSeen.push(phase) }).observe(document, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-flash-phase'] })
    const property = (key, get, set) => Object.defineProperty(HTMLVideoElement.prototype, key, { configurable: true, get, ...(set ? { set } : {}) })
    property('srcObject', function () { return this.testStream }, function (stream) { this.testStream = stream; this.testPlaying = !!stream })
    property('videoWidth', () => 720); property('videoHeight', () => 1280); property('readyState', () => 4)
    property('paused', function () { return !this.testPlaying }); property('currentTime', () => window.freezeVideo ? (window.frozenTime ??= performance.now() / 1000) : performance.now() / 1000)
    HTMLVideoElement.prototype.play = function () { this.testPlaying = true; return Promise.resolve() }
    HTMLVideoElement.prototype.requestVideoFrameCallback = function (callback) { return window.setTimeout(() => {
      if (!window.dropCallbacks) callback(performance.now(), { mediaTime: window.staleMetadata ? 0 : this.currentTime })
    }, window.frameDelay ?? 34) }
    HTMLVideoElement.prototype.cancelVideoFrameCallback = id => window.clearTimeout(id)
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => {
      window.cameraCalls++
      let settings = { exposureMode: 'continuous', whiteBalanceMode: 'continuous' }
      const track = { readyState: 'live', muted: false, addEventListener() {}, stop() { this.readyState = 'ended' },
        getCapabilities: () => locks ? { exposureMode: ['continuous','manual'], whiteBalanceMode: ['continuous','manual'] } : {},
        getSettings: () => settings, applyConstraints: async options => { window.constraintWrites.push(options); settings = { ...settings, ...options.advanced[0] } } }
      window.testTracks.push(track)
      return { getTracks: () => [track], getVideoTracks: () => [track] }
    } } })
    const draw = CanvasRenderingContext2D.prototype.drawImage
    CanvasRenderingContext2D.prototype.drawImage = function (source, ...args) {
      if (!(source instanceof HTMLVideoElement)) return draw.call(this, source, ...args)
      const color = document.querySelector('[data-flash-phase]')?.dataset.flashPhase
      this.fillStyle = reflected ? color === 'red' ? 'rgb(180,80,40)' : color === 'blue' ? 'rgb(40,80,180)' : 'rgb(100,100,100)' : 'rgb(100,100,100)'
      this.fillRect(0, 0, this.canvas.width, this.canvas.height)
    }
  }, { reflected, locks, frameMs, gpuFailure, warmupMs, dropCallbacks, staleMetadata, freezeVideo, inferenceStallMs, diagnostics })
}
export async function startFull(page) {
  await page.getByLabel('Tôi đồng ý dùng ánh sáng đỏ/xanh', { exact: false }).check()
  await page.getByRole('button', { name: 'Bắt đầu xác thực', exact: true }).click()
}
export async function completeActive(page, expect, { frameMs = 34 } = {}) {
  await expect(page.getByRole('status')).toContainText('1/3')
  await page.waitForTimeout(Math.max(400, frameMs * 4))
  await page.evaluate(() => { window.facePose = { blink: .6 } }); await page.waitForTimeout(Math.max(180, frameMs * 2))
  await page.evaluate(() => { window.facePose = {} }); await expect(page.getByRole('status')).toContainText('2/3')
  await page.evaluate(() => { window.facePose = { yaw: -18, nose: .44 } }); await page.waitForTimeout(Math.max(160, frameMs * 2))
  await page.evaluate(() => { window.facePose = { yaw: 18, nose: .56 } }); await page.waitForTimeout(Math.max(160, frameMs * 2))
  await page.evaluate(() => { window.facePose = {} })
}
