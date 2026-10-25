import { API_BASE } from "../api/client";

export type StreamEvent = { event: string; data: unknown };

/** Parses complete server-sent-event frames from a buffer. Returns the events and the unfinished tail. Comment lines
 * (the server's heartbeat) are skipped, and a frame whose data is not JSON is dropped. */
export function parseSse(buffer: string): { events: StreamEvent[]; rest: string } {
  const frames = buffer.split("\n\n");
  const rest = frames.pop() ?? "";
  const events: StreamEvent[] = [];
  for (const frame of frames) {
    let event = "message";
    const data: string[] = [];
    for (const line of frame.split("\n")) {
      if (line.startsWith(":")) continue;
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    if (data.length === 0) continue;
    try {
      events.push({ event, data: JSON.parse(data.join("\n")) });
    } catch {
      // A frame that is not JSON is ignored; the next push carries the full state anyway.
    }
  }
  return { events, rest };
}

/** Opens the live stream with the Bearer token and calls onEvent for each event. Reconnects after a drop, with
 * backoff up to 30 seconds. A 401 stops it, because the token is no longer valid. Returns a stop function. */
export function openStream(token: string, onEvent: (e: StreamEvent) => void): () => void {
  let stopped = false;
  let controller: AbortController | null = null;
  let delay = 1000;

  async function run(): Promise<void> {
    while (!stopped) {
      controller = new AbortController();
      try {
        const res = await fetch(`${API_BASE}/api/stream`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        if (res.status === 401) {
          stopped = true;
          return;
        }
        if (!res.ok || !res.body) throw new Error(`stream ${res.status}`);
        delay = 1000;
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parsed = parseSse(buffer);
          buffer = parsed.rest;
          parsed.events.forEach(onEvent);
        }
      } catch {
        // Dropped or aborted: retry below unless stopped.
      }
      if (stopped) return;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, 30_000);
    }
  }

  void run();
  return () => {
    stopped = true;
    controller?.abort();
  };
}
