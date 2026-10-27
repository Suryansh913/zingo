export type CallState = "connecting" | "connected" | "reconnecting" | "failed" | "closed";
export type MediaProblemKind = "insecure" | "denied" | "no_device" | "in_use" | "unknown";
export class MediaProblem extends Error { constructor(public kind: MediaProblemKind, msg: string) { super(msg); } }

/** Ask for camera+mic. Must be called from a user gesture (we only call it from the "Start video call" button). */
export async function getMedia(): Promise<MediaStream> {
  if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) throw new MediaProblem("insecure", "Video calls need HTTPS (or localhost) and a browser that supports camera access.");
  try { return await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 720 } }, audio: { echoCancellation: true, noiseSuppression: true } }); }
  catch (e: any) {
    const n = e?.name;
    if (n === "NotAllowedError" || n === "SecurityError") throw new MediaProblem("denied", "Camera/microphone permission was denied. Allow access in your browser's site settings, then try again.");
    if (n === "NotFoundError" || n === "OverconstrainedError") throw new MediaProblem("no_device", "No camera or microphone was found.");
    if (n === "NotReadableError" || n === "AbortError") throw new MediaProblem("in_use", "Your camera or microphone is busy or unavailable (another app may be using it).");
    throw new MediaProblem("unknown", "Couldn't start your camera and microphone.");
  }
}

interface Opts { iceServers: RTCIceServer[]; caller: boolean; local: MediaStream; signal: (kind: string, data: object) => void; onRemote: (s: MediaStream) => void; onState: (s: CallState) => void; }
/** One-to-one call. The caller (user_a) makes the offer once both sides have announced "ready"; ICE restarts on network trouble. */
export class CallController {
  private pc: RTCPeerConnection; private pending: RTCIceCandidateInit[] = []; private remoteSet = false; private offered = false;
  private restartTimer?: number; private failTimer?: number; private closed = false;
  constructor(private o: Opts) {
    this.pc = new RTCPeerConnection({ iceServers: o.iceServers });
    o.local.getTracks().forEach(t => this.pc.addTrack(t, o.local));
    this.pc.ontrack = e => o.onRemote(e.streams[0] ?? new MediaStream([e.track]));
    this.pc.onicecandidate = e => { if (e.candidate) o.signal("ice", e.candidate.toJSON()); };
    this.pc.onconnectionstatechange = () => this.onConn();
    o.onState("connecting");
  }
  announceReady() { this.o.signal("ready", {}); }
  private onConn() {
    if (this.closed) return; const s = this.pc.connectionState;
    if (s === "connected") { window.clearTimeout(this.restartTimer); window.clearTimeout(this.failTimer); this.restartTimer = this.failTimer = undefined; this.o.onState("connected"); }
    else if (s === "connecting") this.o.onState("connecting");
    else if (s === "disconnected" || s === "failed") {
      this.o.onState("reconnecting");
      if (!this.restartTimer) this.restartTimer = window.setTimeout(() => { this.restartTimer = undefined;
        if (this.closed || this.pc.connectionState === "connected") return;
        if (this.o.caller) this.makeOffer(true);                       // ICE restart with fresh credentials
        this.failTimer = window.setTimeout(() => { if (!this.closed && this.pc.connectionState !== "connected") this.o.onState("failed"); }, 15000); }, 3000);
    } else if (s === "closed") this.o.onState("closed");
  }
  private async makeOffer(iceRestart = false) {
    this.offered = true; const offer = await this.pc.createOffer({ iceRestart }); await this.pc.setLocalDescription(offer);
    this.o.signal("offer", { type: offer.type, sdp: offer.sdp });
  }
  private async flush() { this.remoteSet = true; for (const c of this.pending.splice(0)) { try { await this.pc.addIceCandidate(c); } catch { /* stale candidate */ } } }
  async onSignal(kind: string, data: any) {
    if (this.closed) return;
    try {
      if (kind === "ready") { if (this.o.caller && !this.offered) await this.makeOffer(); }
      else if (kind === "offer") { await this.pc.setRemoteDescription(data); await this.flush(); const a = await this.pc.createAnswer(); await this.pc.setLocalDescription(a); this.o.signal("answer", { type: a.type, sdp: a.sdp }); }
      else if (kind === "answer") { await this.pc.setRemoteDescription(data); await this.flush(); }
      else if (kind === "ice") { if (this.remoteSet) { try { await this.pc.addIceCandidate(data); } catch { /* ignore */ } } else this.pending.push(data); }
    } catch { this.o.onState("failed"); }
  }
  setMic(on: boolean) { this.o.local.getAudioTracks().forEach(t => (t.enabled = on)); }
  setCam(on: boolean) { this.o.local.getVideoTracks().forEach(t => (t.enabled = on)); }
  close() { this.closed = true; window.clearTimeout(this.restartTimer); window.clearTimeout(this.failTimer); this.o.local.getTracks().forEach(t => t.stop()); this.pc.close(); }
}
