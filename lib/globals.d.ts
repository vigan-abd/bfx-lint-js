import type { Globals } from '../index'

/** Node runtime globals, applied to every linted file. */
export declare const nodeGlobals: Globals

/** Mocha globals, applied only when `setup({ mocha })` is set. */
export declare const mochaGlobals: Globals
