export interface iobObject {
    type: string,
    common: {
        name: string,
        role: string,
        type: string,
        unit?: string,
        read: boolean,
        write: boolean,
        desc?: string
    },
    native?: { id: string }
}



export interface WebWatchSerpApiConfig {
    
    
    SerpApi_Key: string,
    SerpApi_Query: string,
    SerpApi_Enabled: boolean,

    
}

export interface WebWatchGenAiConfig {


    GenAi_Key: string,
    GenAi_Query: string,
    GenAi_Enabled: boolean,


}