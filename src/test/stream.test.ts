import { describe, expect, it } from "vitest";
import { parseSse } from "../lib/stream";

describe("parseSse", () => {
  it("parses a complete snapshot frame", () => {
    const { events, rest } = parseSse('event: snapshot\ndata: {"unread": 2}\n\n');
    expect(events).toEqual([{ event: "snapshot", data: { unread: 2 } }]);
    expect(rest).toBe("");
  });

  it("skips heartbeat comments", () => {
    const { events } = parseSse(": ping\n\nevent: snapshot\ndata: {\"unread\": 0}\n\n");
    expect(events).toEqual([{ event: "snapshot", data: { unread: 0 } }]);
  });

  it("keeps an unfinished frame until the rest arrives", () => {
    const first = parseSse('event: snapshot\ndata: {"unread"');
    expect(first.events).toEqual([]);
    const second = parseSse(`${first.rest}: 3}\n\n`);
    expect(second.events).toEqual([{ event: "snapshot", data: { unread: 3 } }]);
  });

  it("drops a frame whose data is not JSON", () => {
    const { events } = parseSse("event: snapshot\ndata: not json\n\n");
    expect(events).toEqual([]);
  });
});
