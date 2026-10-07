import type { Globals } from '../index'

/** Node runtime globals, applied to every linted file. */
export declare const nodeGlobals: Globals

/** `__dirname` and `__filename`, applied only where `sourceType` is `commonjs`. */
export declare const commonjsGlobals: Globals

/** Mocha globals, applied only when `setup({ mocha })` is set. */
export declare const mochaGlobals: Globals
