/* eslint-disable prefer-template */
/*
 * Created with @iobroker/create-adapter v3.1.5
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
import * as utils from "@iobroker/adapter-core";

import serpapiIfc from "./lib/serpapi";
import genaiIfc from "./lib/genai";
import type { WebWatchSerpApiConfig, WebWatchGenAiConfig } from './lib/types';

import { CronJob } from 'cron';

export class WebWatch extends utils.Adapter {

	serpapi: serpapiIfc | null = null;
	genai: genaiIfc | null = null;
	cronJobs: CronJob<() => void, null>[] = [];
    readCronString: string;
    timezone: string;

	public constructor(options: Partial<utils.AdapterOptions> = {}) {
		super({
			...options,
			name: "web-watch",
		});
		this.on("ready", this.onReady.bind(this));
		this.on("stateChange", this.onStateChange.bind(this));
		// this.on("objectChange", this.onObjectChange.bind(this));
		// this.on("message", this.onMessage.bind(this));
		this.on("unload", this.onUnload.bind(this));

        this.cronJobs = [];
        this.readCronString = "0 0 18 * * *";
        this.timezone = "Europe/Berlin";
	}

	/**
	 * Is called when databases are connected and adapter received configuration.
	 */
    private async onReady(): Promise<void> {
        await Promise.resolve();
        // Initialize your adapter here


        this.log.debug("config: " + JSON.stringify(this.config, null, 2));

        const serpapi_config: WebWatchSerpApiConfig = {
            SerpApi_Key: this.config.SerpApi_key ? this.config.SerpApi_key : "",
            SerpApi_Query:  this.config.SerpApi_SearchString ? this.config.SerpApi_SearchString : "",
            SerpApi_Enabled: this.config.SerpApi_enabled !== undefined ? this.config.SerpApi_enabled : false,
        };

        this.serpapi = new serpapiIfc(this, 1, serpapi_config);

        const genaiapi_config: WebWatchGenAiConfig = {
            GenAi_Key: this.config.GeminiApi_key ? this.config.GeminiApi_key : "",
            GenAi_Query:  this.config.GeminiApi_SearchString ? this.config.GeminiApi_SearchString : "",
            GenAi_Enabled: this.config.GeminiApi_enabled !== undefined ? this.config.GeminiApi_enabled : false,
        };

        this.genai = new genaiIfc(this, 1, genaiapi_config);

        let readCronString = "0 0 18 * * *";
        if (this.config.readCronString !== undefined) {
            readCronString = this.config.readCronString;
        }
		if (readCronString) {
			this.readCronString = readCronString;
		} else {
			this.log.warn("read cron string not defined");
        }
        this.timezone = this.config.timezone || "Europe/Berlin";
        this.log.debug("read every  " + readCronString + "  " + this.timezone);

		this.CronCreate(readCronString, this.Do.bind(this));

		this.CronStatus();

    }

    async Do(): Promise<void> {


        this.log.debug("starting search jobs ... ");

        const result = await this.serpapi?.Start(null);
        await this.genai?.Start(result ?? null);

        this.log.debug("all done ... ");
    }


	/**
	 * Is called when adapter shuts down - callback has to be called under any circumstances!
	 *
	 * @param callback - Callback function
	 */
	private onUnload(callback: () => void): void {
		try {
			// Here you must clear all timeouts or intervals that may still be active
			// clearTimeout(timeout1);
			// clearTimeout(timeout2);
			// ...
            // clearInterval(interval1);

            this.CronStop();

			callback();
		} catch (error) {
			this.log.error(`Error during unloading: ${(error as Error).message}`);
			callback();
		}
	}

	// If you need to react to object changes, uncomment the following block and the corresponding line in the constructor.
	// You also need to subscribe to the objects with `this.subscribeObjects`, similar to `this.subscribeStates`.
	// /**
	//  * Is called if a subscribed object changes
	//  */
	// private onObjectChange(id: string, obj: ioBroker.Object | null | undefined): void {
	// 	if (obj) {
	// 		// The object was changed
	// 		this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
	// 	} else {
	// 		// The object was deleted
	// 		this.log.info(`object ${id} deleted`);
	// 	}
	// }

	/**
	 * Is called if a subscribed state changes
	 *
	 * @param id - State ID
	 * @param state - State object
	 */
	private onStateChange(id: string, state: ioBroker.State | null | undefined): void {
		if (state) {
			// The state was changed
			this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);

			if (state.ack === false) {
				// This is a command from the user (e.g., from the UI or other adapter)
				// and should be processed by the adapter
				this.log.info(`User command received for ${id}: ${state.val}`);

				// TODO: Add your control logic here
			}
		} else {
			// The object was deleted or the state value has expired
			this.log.info(`state ${id} deleted`);
		}
	}
	// If you need to accept messages in your adapter, uncomment the following block and the corresponding line in the constructor.
	// /**
	//  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
	//  * Using this method requires "common.messagebox" property to be set to true in io-package.json
	//  */
	//
	// private onMessage(obj: ioBroker.Message): void {
	// 	if (typeof obj === "object" && obj.message) {
	// 		if (obj.command === "send") {
	// 			// e.g. send email or pushover or whatever
	// 			this.log.info("send command");
	// 			// Send response in callback if required
	// 			if (obj.callback) this.sendTo(obj.from, obj.command, "Message received", obj.callback);
	// 		}
	// 	}
	// }



    //===============================================================================
    //cron functions
    async CronStop(): Promise<void> {
        if (this.cronJobs.length > 0) {
            this.log.debug("delete " + this.cronJobs.length + " cron jobs");
            //cancel all cron jobs...
            const start = this.cronJobs.length - 1;
            for (let n = start; n >= 0; n--) {
                await this.cronJobs[n].stop();
            }
            this.cronJobs = [];
        }
    }

    /*
    function deleteCronJob(id) {
	
        cronJobs[id].stop();
	
        if (id === cronJobs.length - 1) {
            cronJobs.pop(); //remove last
        }
        else {
            delete cronJobs[id];
        }
        CronStatus();
	
	
    }
    */

    CronCreate(cronString: string, callback: () => void): void {
        try {
            const timezone = this.timezone || "Europe/Berlin";

            const nextCron = this.cronJobs.length;

            this.log.debug("create cron job #" + nextCron + " with string: " + cronString + " " + timezone);

            //details siehe https://www.npmjs.com/package/cron
            const job = CronJob.from({
                cronTime: cronString,
                onTick: () => callback(),
                onComplete: () => this.log.debug("cron job stopped"),
                start: true,
                timeZone: timezone
            });
            this.cronJobs.push(job);


        } catch (e) {
            this.log.error("exception in CronCreate [" + String(e) + "]");
        }
    }

    CronStatus(): void {
        let n = 0;
        let length = 0;
        try {
            if (this.cronJobs !== undefined && this.cronJobs != null) {

                length = this.cronJobs.length;
                //adapter.log.debug("cron jobs");
                for (n = 0; n < length; n++) {
                    if (this.cronJobs[n] !== undefined && this.cronJobs[n] != null) {
                        this.log.debug("cron status = " + this.cronJobs[n].isActive + " next event: " + this.timeConverter("DE", this.cronJobs[n].nextDate().toJSDate()));


                    }
                }

                if (length > 500) {
                    this.log.error("more then 500 cron jobs existing for this adapter, this might be a configuration error! (" + length + ")");
                } else {
                    this.log.info(length + " cron job(s) created");
                }
            }
        } catch (e) {
            this.log.error("exception in getCronStat [" + String(e) + "] : " + n + " of " + length);
        }
    }

    timeConverter(SystemLanguage: string, time: Date, timeonly = false): string {

        let a;

        if (time != null) {
            a = new Date(time);
        } else {
            a = new Date();
        }
        let months;

        if (SystemLanguage === "de") {
            months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
        } else if (SystemLanguage === "en") {
            months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
        } else {
            months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        }

        const year = a.getFullYear();
        const month = months[a.getMonth()];
        const date = a.getDate();
        const sdate = date < 10 ? " " + date.toString() : date.toString();
        const hour = a.getHours();
        const shour = hour < 10 ? "0" + hour.toString() : hour.toString();
        const min = a.getMinutes();
        const smin = min < 10 ? "0" + min.toString() : min.toString();
        const sec = a.getSeconds();
        const ssec = sec < 10 ? "0" + sec.toString() : sec.toString();

        let sRet = "";
        if (timeonly) {
            sRet = shour + ":" + smin + ":" + ssec;
        } else {
            sRet = sdate + " " + month + " " + year.toString() + " " + shour + ":" + smin + ":" + ssec;
        }

        return sRet;
    }
}
if (require.main !== module) {
	// Export the constructor in compact mode
	module.exports = (options: Partial<utils.AdapterOptions> | undefined) => new WebWatch(options);
} else {
	// otherwise start the instance directly
	(() => new WebWatch())();
}
