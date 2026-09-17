import { registerFixedBundlePixel } from "./fixed-bundle-pixel";
import { registerMixMatchPixel } from "./mix-match-pixel";

type PixelApi = {
    settings: Record<string, unknown>;
    analytics: { subscribe: (event: string, callback: (event: any) => void) => void };
    browser: { localStorage: { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void> } };
};

const registerFns = [registerFixedBundlePixel, registerMixMatchPixel];

/**
 * Entry point the parent app's Web Pixel Extension (`e-composer-pixel/src/index.ts`)
 * imports and calls once — wires up every extension's pixel module. Add a new
 * extension's pixel module by adding its `register<Name>Pixel` here; each is
 * wrapped in its own try/catch so one module's failure doesn't stop the rest
 * from registering.
 */
export function registerCroPixels(api: PixelApi) {
    for (const register of registerFns) {
        try {
            register(api);
        } catch (error) {
            console.error(`[cro-pixels] failed to register ${register.name}`, error);
        }
    }
}
