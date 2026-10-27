import { Component, ReactNode } from "react";
/** Last line of defence against blank screens: a render error shows a recovery screen instead of an empty page. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: unknown) { console.error("[ui] render error", error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    return (<div className="grid min-h-dvh place-items-center bg-soft p-6 text-center"><div className="max-w-sm space-y-4 rounded-3xl border border-line bg-white p-8 shadow-sm">
      <h1 className="text-xl font-bold">Something went wrong</h1><p className="text-sm text-mute">The page hit an unexpected error. Your data is safe.</p>
      <div className="flex justify-center gap-2"><button className="btn" onClick={() => location.reload()}>Reload</button><a className="btn2" href="/">Go home</a></div>
      <details className="text-left text-xs text-mute"><summary className="cursor-pointer">Technical details</summary><pre className="mt-2 whitespace-pre-wrap">{this.state.error.message}</pre></details></div></div>);
  }
}
