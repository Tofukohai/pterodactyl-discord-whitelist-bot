export interface WhitelistEntry {
    id: number;
    discord_id: string;
    discord_name: string;
    mc_username: string;
    whitelisted_at: string;
    removed_at: string | null;
}
export declare function get_user_entries(discord_id: string): WhitelistEntry[];
export declare function get_user_max_slots(discord_id: string, global_default: number): number;
export declare function get_entry_by_mc_username(mc_username: string): WhitelistEntry | undefined;
export declare function add_entry(discord_id: string, discord_name: string, mc_username: string): void;
export declare function remove_entry(mc_username: string): boolean;
export declare function reset_user_entries(discord_id: string): string[];
export declare function set_user_override(discord_id: string, max_slots: number): void;
export declare function get_active_entries_count(): number;
export declare function get_active_entries_page(page: number, page_size: number): WhitelistEntry[];
//# sourceMappingURL=database.d.ts.map