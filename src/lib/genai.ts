/* eslint-disable prefer-template */
import type { WebWatch } from "../main";
import Base from "./base";
import type { WebWatchGenAiConfig } from './types';

import { GoogleGenAI } from "@google/genai";


export default class genaiIfc extends Base {

	config: WebWatchGenAiConfig;

	constructor(adapter: WebWatch, id: number, config: WebWatchGenAiConfig) {
		super(adapter, id, "genaiIfc" + id, config);
		
        this.config = config;

	}


	async Start(param: string | null): Promise<void> {


		this.logInfo("Start GenAi with config: " + JSON.stringify(this.config, null, 2));
		if (this.config.GenAi_Enabled) {

			await this.checkVariables();

			// call base class Start method
			await super.Start(param);

			try {
				
                const Gemini_API_Key = this.config.GenAi_Key;

				//details see https://ai.google.dev/api/interactions-api?hl=de
				const ai = new GoogleGenAI({
					apiKey: Gemini_API_Key,
				});

				
                let prompt = this.config.GenAi_Query;

				if (param) {

					prompt = prompt + " " + param;
				}

				const interaction = await ai.interactions.create({
					model: "gemini-3.5-flash",
					input: prompt,
				});

				this.logInfo(String(interaction.output_text));

				await this.safeSetState("genai.result", true, String(interaction.output_text));


			} catch (e) {
				this.logError("exception in getJson [" + String(e) + "]");
			}
		}
	}


	async checkVariables(): Promise<void> {
		this.logDebug("init variables ");

		let key = "genai";
		let obj = {
			type: "channel",
			common: {
				name: "genai",
				role: "",
				type: "",
				unit: "",
				read: true,
				write: false,
				desc: ""
			}
		};
		await this.CreateObject(key, obj);


		key = "genai.result";
		obj = {
			type: "state",
			common: {
				name: "result",
				type: "string",
				role: "info.status",
				read: true,
				write: false,
				desc: "result of genai interaction",
                unit: ""
			}
		};
		await this.CreateObject(key, obj);
	}


}
