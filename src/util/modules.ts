import { readdir } from "node:fs/promises"
import { ModuleFunction } from "../types/module"

// export let moduleNames = await readdir("modules")

// for (let name of moduleNames) {
//     console.log(await import("../modules/" + name))
// }

export const getModules = async () => {
    let modules: { name: string, run: ModuleFunction, version: string, sourceCode: string }[] = []

    let moduleNames = await readdir("modules")

    for (let name of moduleNames) {
        let module = await import(import.meta.resolve("../../modules/" + name))

        if (module.disabled) continue

        modules.push(module)
    }

    return { active: modules, total: moduleNames.length }
}