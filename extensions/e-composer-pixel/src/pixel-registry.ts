import { subscribeCroContext, type PixelApi } from "./core";
import { registerFixedBundlePixel } from "./fixed-bundle-pixel";
import { registerMixMatchPixel } from "./mix-match-pixel";
import { registerVolumeDiscountPixel } from "./volume-discount-pixel";

const registerFns = [registerFixedBundlePixel, registerMixMatchPixel, registerVolumeDiscountPixel];

/**
 * Entry point the parent app's Web Pixel Extension (`e-composer-pixel/src/index.ts`)
 * imports and calls once — wires up every extension's pixel module. Add a new
 * extension's pixel module by adding its `register<Name>Pixel` here; each is
 * wrapped in its own try/catch so one module's failure doesn't stop the rest
 * from registering.
 */
export function registerCroPixels(api: PixelApi) {
    // Subscribed once for the whole bundle, before the modules: it feeds every
    // module's currency conversion and visitor id, and is not tied to any one
    // extension.
    try {
        subscribeCroContext(api);
    } catch (error) {
        console.error("[cro-pixels] failed to subscribe cro context", error);
    }

    for (const register of registerFns) {
        try {
            register(api);
        } catch (error) {
            console.error(`[cro-pixels] failed to register ${register.name}`, error);
        }
    }
}
