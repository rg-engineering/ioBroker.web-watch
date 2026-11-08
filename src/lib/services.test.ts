import { expect } from "chai";
import { afterEach, describe, it } from "mocha";
import sinon from "sinon";
import * as serpapiModule from "serpapi";
import { GoogleGenAI } from "@google/genai";
import type { WebWatch } from "../main";
import type { WebWatchGenAiConfig, WebWatchSerpApiConfig } from "./types";
import serpapiIfc from "./serpapi";
import genaiIfc from "./genai";

interface RecordedState {
    id: string;
    state: { ack: boolean; val: string | number | boolean };
}

function createAdapter(): {
    adapter: WebWatch;
    objects: string[];
    states: RecordedState[];
    logs: { level: string; message: string }[];
} {
    const objects: string[] = [];
    const states: RecordedState[] = [];
    const logs: { level: string; message: string }[] = [];
    const adapter = {
        log: {
            debug: (message: string) => logs.push({ level: "debug", message }),
            info: (message: string) => logs.push({ level: "info", message }),
            warn: (message: string) => logs.push({ level: "warn", message }),
            error: (message: string) => logs.push({ level: "error", message }),
        },
        setObjectNotExistsAsync: (id: string) => {
            objects.push(id);
            return Promise.resolve();
        },
        getObjectAsync: () => Promise.resolve(null),
        setState: (id: string, state: RecordedState["state"]) => {
            states.push({ id, state });
            return Promise.resolve();
        },
    } as unknown as WebWatch;

    return { adapter, objects, states, logs };
}

function stubGemini(): {
    createInteraction: sinon.SinonStub;
    apiKey: () => string;
    accessCount: () => number;
} {
    const interactions = new GoogleGenAI({ apiKey: "test" }).interactions;
    const createInteraction = sinon.stub(interactions, "create");
    let apiKey = "";
    let accessCount = 0;

    sinon.stub(GoogleGenAI.prototype, "interactions").get(function (this: GoogleGenAI) {
        apiKey = Reflect.get(this, "apiKey") ?? "";
        accessCount++;
        return interactions;
    });

    return {
        createInteraction,
        apiKey: () => apiKey,
        accessCount: () => accessCount,
    };
}

function serpApiConfig(overrides: Partial<WebWatchSerpApiConfig> = {}): WebWatchSerpApiConfig {
    return {
        SerpApi_Key: "serp-key",
        SerpApi_Query: "weather tomorrow",
        SerpApi_Enabled: true,
        ...overrides,
    };
}

function genAiConfig(overrides: Partial<WebWatchGenAiConfig> = {}): WebWatchGenAiConfig {
    return {
        GenAi_Key: "gemini-key",
        GenAi_Query: "Summarize the findings",
        GenAi_Enabled: true,
        ...overrides,
    };
}

describe("SerpAPI interface", () => {
    afterEach(() => sinon.restore());

    it("does not call SerpAPI or create states when disabled", async () => {
        const request = sinon.stub().resolves({ organic_results: [] });
        sinon.stub(serpapiModule, "getJson").get(() => request);
        const { adapter, objects, states } = createAdapter();
        const client = new serpapiIfc(adapter, 1, serpApiConfig({ SerpApi_Enabled: false }));

        const result = await client.Start(null);

        expect(result).to.equal("");
        expect(request.called).to.equal(false);
        expect(objects).to.deep.equal([]);
        expect(states).to.deep.equal([]);
    });

    it("queries SerpAPI and stores and returns the full response when a snippet exists", async () => {
        const response = { organic_results: [{ snippet: "Sunny tomorrow" }], search_metadata: { id: "search-1" } };
        const request = sinon.stub().resolves(response);
        sinon.stub(serpapiModule, "getJson").get(() => request);
        const { adapter, objects, states } = createAdapter();
        const client = new serpapiIfc(adapter, 1, serpApiConfig());

        const result = await client.Start(null);

        expect(request.calledOnceWithExactly({
            q: "weather tomorrow",
            hl: "de",
            gl: "de",
            google_domain: "google.com",
            api_key: "serp-key",
        })).to.equal(true);
        expect(result).to.equal(JSON.stringify(response, null, 2));
        expect(objects).to.deep.equal(["serpapi", "serpapi.result"]);
        expect(states).to.deep.equal([{
            id: "serpapi.result",
            state: { ack: true, val: JSON.stringify(response, null, 2) },
        }]);
    });

    it("stores an empty result and warns when there is no organic snippet", async () => {
        const request = sinon.stub().resolves({ organic_results: [{ title: "No snippet" }] });
        sinon.stub(serpapiModule, "getJson").get(() => request);
        const { adapter, states, logs } = createAdapter();
        const client = new serpapiIfc(adapter, 1, serpApiConfig());

        const result = await client.Start(null);

        expect(result).to.equal("");
        expect(states).to.deep.equal([{ id: "serpapi.result", state: { ack: true, val: "" } }]);
        expect(logs.some(log => log.level === "warn" && log.message.includes("no search results found"))).to.equal(true);
    });

    it("logs API errors without writing a result state", async () => {
        const request = sinon.stub().rejects(new Error("request failed"));
        sinon.stub(serpapiModule, "getJson").get(() => request);
        const { adapter, states, logs } = createAdapter();
        const client = new serpapiIfc(adapter, 1, serpApiConfig());

        const result = await client.Start(null);

        expect(result).to.equal("");
        expect(states).to.deep.equal([]);
        expect(logs.some(log => log.level === "error" && log.message.includes("request failed"))).to.equal(true);
    });
});

describe("Gemini interface", () => {
    afterEach(() => sinon.restore());

    it("appends search results to the prompt and stores Gemini output", async () => {
        const gemini = stubGemini();
        const createInteraction = gemini.createInteraction.resolves({ output_text: "A concise summary" });
        const { adapter, objects, states } = createAdapter();
        const client = new genaiIfc(adapter, 1, genAiConfig());

        await client.Start("Search results");

        expect(gemini.apiKey()).to.equal("gemini-key");
        expect(gemini.accessCount()).to.equal(1);
        expect(createInteraction.calledOnceWithExactly({
            model: "gemini-3.5-flash",
            input: "Summarize the findings Search results",
        })).to.equal(true);
        expect(objects).to.deep.equal(["genai", "genai.result"]);
        expect(states).to.deep.equal([{ id: "genai.result", state: { ack: true, val: "A concise summary" } }]);
    });

    it("uses only the configured prompt when no search results are supplied", async () => {
        const gemini = stubGemini();
        const createInteraction = gemini.createInteraction.resolves({ output_text: "Prompt-only response" });
        const { adapter } = createAdapter();
        const client = new genaiIfc(adapter, 1, genAiConfig());

        await client.Start(null);

        expect(createInteraction.calledOnceWithExactly({
            model: "gemini-3.5-flash",
            input: "Summarize the findings",
        })).to.equal(true);
    });

    it("does not call Gemini or create states when disabled", async () => {
        const gemini = stubGemini();
        const createInteraction = gemini.createInteraction;
        const { adapter, objects, states } = createAdapter();
        const client = new genaiIfc(adapter, 1, genAiConfig({ GenAi_Enabled: false }));

        await client.Start("Search results");

        expect(gemini.accessCount()).to.equal(0);
        expect(createInteraction.called).to.equal(false);
        expect(objects).to.deep.equal([]);
        expect(states).to.deep.equal([]);
    });

    it("logs API errors without writing a result state", async () => {
        const gemini = stubGemini();
        gemini.createInteraction.rejects(new Error("Gemini unavailable"));
        const { adapter, states, logs } = createAdapter();
        const client = new genaiIfc(adapter, 1, genAiConfig());

        await client.Start(null);

        expect(states).to.deep.equal([]);
        expect(logs.some(log => log.level === "error" && log.message.includes("Gemini unavailable"))).to.equal(true);
    });
});
