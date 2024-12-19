import { readdir } from "node:fs/promises"
import { ModuleFunction, ModuleInitFunction } from "../types/module"

// export let moduleNames = await readdir("modules")

// for (let name of moduleNames) {
//     console.log(await import("../modules/" + name))
// }

type Module = { 
    name: string,
    version: string,
    sourceCode: string,
    disabled: boolean,
    run: ModuleFunction,
    init?: ModuleInitFunction
}

export const getModules = async () => {
    let modules: Module[] = []

    let moduleNames = await readdir("modules")

    for (let name of moduleNames) {
        let module = await import(import.meta.resolve("../../modules/" + name)) as Module

        if (module.disabled) continue

        try {
            if (!module.init) {
                modules.push(module)
                continue
            } 
            
            let res = await module.init()

            if (res == 200) modules.push(module)
            else {
                console.log(`Couldn't initialise ${module.name || "undefined"} (v${module.version || "undefined"}) - ${res || "no error provided."}`)
            }
        } catch (e) {
            console.log(`Couldn't initialise ${module.name} - ${e}`)
        }
    }

    return { active: modules, total: moduleNames.length }
}