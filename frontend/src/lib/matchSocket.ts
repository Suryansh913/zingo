import { API, token } from "./api";
export type SockStatus = "connecting" | "open" | "reconnecting" | "offline";
const URL_ = API.replace(/^http/, "ws") + "/ws/match/";
/** Signaling + match events socket. Auth is the first message (token never in the URL). Reconnects with backoff. */
export class MatchSocket {
  private ws?: WebSocket; private closed = false; private attempt = 0; private timer?: number; private beat?: number; ready = false;
  constructor(private onEvent: (e: any) => void, private onStatus: (s: SockStatus) => void) {}
  connect() {
    this.onStatus(this.attempt ? "reconnecting" : "connecting"); this.ready = false;
    const ws = new WebSocket(URL_); this.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: "auth", token: token.get() }));
    ws.onmessage = ev => { let d: any; try { d = JSON.parse(ev.data); } catch { return; }
      if (d.type === "ready") { this.ready = true; this.attempt = 0; this.onStatus("open"); window.clearInterval(this.beat); this.beat = window.setInterval(() => this.send({ type: "ping" }), 10000); }
      this.onEvent(d); };
    ws.onclose = ev => { this.ready = false; window.clearInterval(this.beat); if (this.closed) return;
      if (ev.code === 4401) { this.onStatus("offline"); this.onEvent({ type: "auth_failed" }); return; }
      this.attempt++; this.onStatus("reconnecting"); this.timer = window.setTimeout(() => this.connect(), Math.min(1000 * 2 ** this.attempt, 10000)); };
    ws.onerror = () => ws.close();
  }
  send(o: object): boolean { if (this.ws && this.ws.readyState === WebSocket.OPEN && this.ready) { this.ws.send(JSON.stringify(o)); return true; } return false; }
  close() { this.closed = true; window.clearTimeout(this.timer); window.clearInterval(this.beat); this.ws?.close(); }
}
