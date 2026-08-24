"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const base_1 = __importDefault(require("./base"));
const serpapi_1 = require("serpapi");
class serpapiIfc extends base_1.default {
    config;
    constructor(adapter, id, config) {
        super(adapter, id, "serpapiIfc" + id, config);
        this.config = config;
    }
    async Start(param) {
        let res = "";
        this.logInfo("Start SerpApi with config: " + JSON.stringify(this.config, null, 2));
        if (this.config.SerpApi_Enabled) {
            await this.checkVariables();
            // call base class Start method
            await super.Start(param);
            // details see https://serpapi.com/search-api
            const SerpApi_key = this.config.SerpApi_Key;
            try {
                const response = await (0, serpapi_1.getJson)({
                    q: this.config.SerpApi_Query,
                    //location: "Deutschland",
                    hl: "de",
                    gl: "de",
                    google_domain: "google.com",
                    api_key: SerpApi_key,
                });
                const result = response.organic_results?.[0]?.snippet;
                if (result) {
                    this.logInfo(JSON.stringify(response, null, 2));
                    await this.safeSetState("serpapi.result", true, JSON.stringify(response, null, 2));
                    res = JSON.stringify(response, null, 2);
                }
                else {
                    this.logWarn("no search results found.");
                    await this.safeSetState("serpapi.result", true, "");
                }
            }
            catch (e) {
                this.logError("exception in getJson [" + String(e) + "]");
            }
        }
        return res;
    }
    async checkVariables() {
        this.logDebug("init variables ");
        let key = "serpapi";
        let obj = {
            type: "channel",
            common: {
                name: "serpapi",
                role: "",
                type: "",
                unit: "",
                read: true,
                write: false,
                desc: ""
            }
        };
        await this.CreateObject(key, obj);
        key = "serpapi.result";
        obj = {
            type: "state",
            common: {
                name: "result",
                type: "string",
                role: "info.status",
                read: true,
                write: false,
                unit: "",
                desc: "result of serpapi search"
            }
        };
        await this.CreateObject(key, obj);
    }
}
exports.default = serpapiIfc;
//# sourceMappingURL=serpapi.js.map