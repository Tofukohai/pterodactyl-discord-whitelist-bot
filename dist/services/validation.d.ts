export declare function validate_mc_username(username: string): {
    valid: boolean;
    reason?: string;
};
interface MojangProfile {
    id: string;
    name: string;
}
export declare function check_mojang_username(username: string): Promise<MojangProfile | null>;
export {};
//# sourceMappingURL=validation.d.ts.map