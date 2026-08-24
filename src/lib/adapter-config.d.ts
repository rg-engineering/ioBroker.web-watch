// This file extends the AdapterConfig type from "@iobroker/types"
import type { WebWatchConfig } from "./types";


// Augment the globally declared type ioBroker.AdapterConfig
declare global {
	namespace ioBroker {

        
		interface AdapterConfig {

			readInterval: number;
			timezone: string;

			SerpApi_enabled: boolean;
            SerpApi_key: string;
            SerpApi_SearchString: string;

            GeminiApi_enabled: boolean;
			GeminiApi_key: string;
            GeminiApi_SearchString: string;
		}
	}
}

// this is required so the above AdapterConfig is found by TypeScript / type checking
export {};