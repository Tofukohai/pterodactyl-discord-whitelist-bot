import "dotenv/config";
export declare const config: {
    readonly discord: {
        readonly token: string;
        readonly client_id: string;
        readonly whitelist_channel_id: string;
        readonly admin_role_id: string;
    };
    readonly pterodactyl: {
        readonly api_url: string;
        readonly api_key: string;
        readonly server_id: string;
    };
    readonly limits: {
        readonly max_whitelists_per_user: number;
        readonly cooldown_seconds: number;
    };
};
//# sourceMappingURL=config.d.ts.map