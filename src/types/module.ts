export type ModuleProps = { 
    checkableStrings: string[],
    rawActivity: any
}
export type ModuleFunction = (props: ModuleProps) => Promise<{ reject: boolean }>
export type ModuleInitFunction = () => Promise<200 | string> // 200 = ok; string = error message